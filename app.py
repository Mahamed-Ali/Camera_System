from flask import Response, jsonify, send_from_directory, request
from config import app
from options import options
from utils.camera import cam_utils
from utils.socket import socketio
from utils import *
import csv
import os
from flask_cors import cross_origin
from moviepy.editor import VideoFileClip
import json

@app.route('/')
@app.route('/api')
def index():
    return app.send_static_file('index.html')

@app.route('/feed')
@app.route('/api/feed')
def feed():
    return Response(cam_utils.gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# The version of Flask on the Pi could be a little old to support
# the newer @app decorator functions if installed with apt

# @app.get('/videos')
@app.route('/videos')
@app.route('/api/videos')
def list_videos():
    return jsonify(get_videos())

# @app.delete('/videos/<name>')
@app.route('/videos/delete/<name>', methods=['DELETE'])
@app.route('/api/videos/delete/<name>', methods=['DELETE'])
def del_video(name):
    result = delete_video(name)
    # تحديث recordings.json بعد الحذف
    json_path = os.path.join('frontend/public/recordings', 'recordings.json')
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # احذف الفيديو من القائمة إذا كان موجودًا
            data = [rec for rec in data if rec.get('name') != name]
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Failed to update recordings.json: {e}")
    return jsonify({ "message": result })

@app.route('/recordings/')
def get_recordings():
    recordings_path = os.path.join(app.static_folder, 'recordings')
    json_path = os.path.join(recordings_path, 'recordings.json')
    try:
        files = os.listdir(recordings_path)
        videos = []
        for f in files:
            if f.endswith(".mp4"):
                file_path = os.path.join(recordings_path, f)
                size = os.path.getsize(file_path)
                # Try to get real duration
                try:
                    clip = VideoFileClip(file_path)
                    duration = f"{int(clip.duration)}s"
                    clip.close()
                except Exception:
                    duration = "N/A"
                videos.append({
                    "name": f,
                    "url": f"/recordings/{f}",
                    "date": f.split("_")[0],
                    "size": f"{size // 1_000_000} MB",
                    "duration": duration
                })
        
        # Update recordings.json with the latest data
        try:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(videos, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Failed to update recordings.json: {e}")
            
        return jsonify(videos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/recordings/<filename>')
@app.route('/api/recordings/<filename>')
def serve_recording(filename):
    recordings_path = os.path.join(app.static_folder, 'recordings')
    try:
        return send_from_directory(recordings_path, filename, mimetype='video/mp4')
    except Exception as e:
        return jsonify({"error": str(e)}), 404

# Catch-all route for React Router (except API/static)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path.startswith('api') or path.startswith('recordings') or path.startswith('static'):
        return send_from_directory(app.static_folder, path)
    return app.send_static_file('index.html')

@app.route('/<path:filename>')
@app.route('/api/<path:filename>')
def send_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.after_request
def add_header(response):
    # Too much caching for a very lively dashboard with feed and frequent updates and logs
    # Disabling all caching to make sure users always get the latest data
    response.cache_control.no_cache = True
    response.cache_control.no_store = True
    response.cache_control.must_revalidate = True
    response.cache_control.max_age = 0

    return response

# Check if the app is started with autostart argument
if len(sys.argv) > 1 and sys.argv[1] == 'autostart':
    # Log autostart to activity logs if logging is enabled
    if options.logging:
        append_log("autostart", "Web server auto-started", "Web server started automatically")
    
    # Disable auto start if it was set due to a reboot
    # disable_auto_start()

def notify(title, key=None):
    # Send a notification to the frontend
    notify_sock(title, key, socketio)

# Link camera events to appropriate socket events
cam_utils.inform = lambda event, data=None: socketio.emit(event, data)
cam_utils.notify = notify

@app.route('/logs')
@cross_origin()
def get_logs():
    logs_path = os.path.join(app.static_folder, 'activitylogs.csv')
    logs = []
    if os.path.exists(logs_path):
        with open(logs_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                logs.append({
                    "timestamp": row.get("Timestamp"),
                    "shortMessage": row.get("Short Message"),
                    "longMessage": row.get("Long Message"),
                    "logType": row.get("Log Type")
                })
    return jsonify(logs[::-1])  # Most recent first

@app.route('/logs/clear', methods=['POST'])
@cross_origin()
def clear_logs():
    logs_path = os.path.join(app.static_folder, 'activitylogs.csv')
    with open(logs_path, 'w') as f:
        f.write("Timestamp,Short Message,Long Message,Log Type\n")
    return jsonify({"status": "cleared"})

@app.route('/api/videos/start', methods=['POST'])
@cross_origin()
def start_manual_recording():
    try:
        cam_utils.start_recording()
        return jsonify({"status": "started"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/videos/stop', methods=['POST'])
@cross_origin()
def stop_manual_recording():
    try:
        cam_utils.stop_recording()
        return jsonify({"status": "stopped"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    # Run the app with socketio support
    socketio.run(app, '0.0.0.0', 5000)
