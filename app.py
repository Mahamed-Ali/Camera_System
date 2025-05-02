from flask import Response, jsonify, send_from_directory
from config import app
from options import options
from utils.camera import cam_utils
from utils.socket import socketio
from utils import *

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
@app.route('/videos/delete/<name>')
@app.route('/api/videos/delete/<name>')
def del_video(name):
    return jsonify({ "message": delete_video(name) })
@app.route('/recordings/')
def get_recordings():
    recordings_path = os.path.join(app.static_folder, 'recordings')
    try:
        files = os.listdir(recordings_path)
        videos = [
            {
                "name": f,
                "url": f"/recordings/{f}",
                "date": f.split("_")[0]
            }
            for f in files if f.endswith(".mp4")
        ]
        return jsonify(videos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

if __name__ == '__main__':
    # Run the app with socketio support
    socketio.run(app, '0.0.0.0', 5000)
