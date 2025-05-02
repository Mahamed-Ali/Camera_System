import cv2
import os, sys
import subprocess
import tempfile

from textwrap import dedent
from datetime import datetime
from csv import writer as csv_writer
from config import *

def append_log(log_type, short_msg, long_msg) -> list:
    """Function to append a log to the CSV file"""
    file_exists = os.path.exists(log_file)
    should_add_header = not file_exists or os.stat(log_file).st_size < 10
    log_data = [str(datetime.now()), short_msg, long_msg, log_type]

    with open(log_file, "a", newline="") as f:
        writer = csv_writer(f)
        if should_add_header:
            # Write the header only if the file is newly created or empty
            writer.writerow(["Timestamp", "Short Message", "Long Message", "Log Type"])

        # Write the actual log data
        writer.writerow(log_data)

    return log_data

def get_video_info(name):
    video_path = os.path.join(recordings_dir, name)
    if not os.path.isfile(video_path):
        return "File not found"
    
def get_video_info(name):
    video_path = os.path.join(recordings_dir, name)
    thumbnail = os.path.join(recordings_dir, f"thumbnails/{os.path.basename(video_path)}.jpg")
    filename = os.path.basename(video_path)

    if not os.path.isfile(video_path):
        return print("File not found")

    # If file contains '.processing', it is still being written to,
    # so return basic info to indicate that
    if ".processing" in name:
        return { "filename": filename, "processing": True }

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Unable to open recording", path.basename(video_path))
        return { "filename": filename, "corrupt": True }

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = frame_count / fps if fps > 0 else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Generate a thumbnail (capture a frame around the middle of the video)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_count // 2)
    ret, frame = cap.read()

    # Only generate a thumbnail if it doesn't already exist 
    if ret and not os.path.isfile(thumbnail):
        os.makedirs(os.path.dirname(thumbnail), exist_ok=True)
        cv2.imwrite(thumbnail, frame)

    cap.release()

    return {
        'filename': os.path.basename(video_path),
        'thumbnail': os.path.basename(thumbnail),
        'size': os.path.getsize(video_path),
        'duration': duration,
        'width': width,
        'height': height,
    }

def get_videos():
    videos = [f for f in os.listdir(recordings_dir) if f.endswith('.mp4')]
    video_info_list = [get_video_info(name) for name in videos]
    return [info for info in video_info_list if info]

def delete_video(name):
    name = os.path.basename(name)
    video_path = os.path.join(recordings_dir, name)
    thumbnail = os.path.join(recordings_dir, f"thumbnails/{name}.jpg")
    
    if not os.path.isfile(video_path):
        return "File not found"

    # Delete the video file and its thumbnail
    try: os.remove(video_path), os.remove(thumbnail)
    except: pass

def clean_filename(filename):
    return filename.replace('.processing', '')
        
def setup_autostart():
    # Might not want to set up autostart in a testing environment
    if testing_environment:
        print("Not setting up autostart in testing environment")
        return
    
    # Make sure the entry file is correct to avoid any issues
    entry_file = os.path.join(os.getcwd(), 'app.py')
    if not os.path.exists(entry_file):
        raise FileNotFoundError(f"Entry file '{entry_file}' not found")
        
    # https://man7.org/linux/man-pages/man5/systemd.service.5.html
    service_content = dedent(f"""
        [Unit]
        Description=My Flask App
        After=network.target

        [Service]
        User={os.getlogin()}
        WorkingDirectory={os.getcwd()}
        ExecStart={sys.executable} {entry_file} autostart
        Restart=always
        Environment="PATH=/usr/bin:/usr/local/bin"
        Environment="PYTHONUNBUFFERED=1"

        [Install]
        WantedBy=multi-user.target
        """)

    service_name = 'securitycam.service'
    service_path = f'/etc/systemd/system/{service_name}'

    # Create a temporary file to write the service definition
    # Could write directly to the service file, but cba to deal with permissions
    # so might as well just use bash and sudo 🤷
    with tempfile.NamedTemporaryFile(delete=False, mode='w') as f:
        f.write(service_content)
        temp_file_path = f.name

    # Move the temporary file to the systemd directory
    subprocess.run(('sudo', 'mv', temp_file_path, service_path), check=True)
    # Reload systemd to recognise the new service
    subprocess.run(('sudo', 'systemctl', 'daemon-reload'), check=True)
    # Enable and start the service
    subprocess.run(('sudo', 'systemctl', 'enable', service_name), check=True)
    subprocess.run(('sudo', 'systemctl', 'start', service_name), check=True)

    # Clean up the temporary file if it wasn't moved
    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)

def disable_auto_start():
    service_name = 'securitycam.service'
    service_path = f'/etc/systemd/system/{service_name}'

    # Remove the service file if it exists and disable the service
    if not os.path.exists(service_path):
        return

    # Stop the service if it's running
    # subprocess.run(('sudo', 'systemctl', 'stop', service_name), check=False)
    subprocess.run(('sudo', 'systemctl', 'disable', service_name), check=False)
    subprocess.run(('sudo', 'systemctl', 'daemon-reload'), check=False)
    subprocess.run(('sudo', 'rm', '-f', service_path), check=False)

# On start, change files that have .processing in their name to .mp4
# Camer might have crashed or been stopped during recording. The file might be corrupt though
for file in os.listdir(recordings_dir):
    if ".processing" in file:
        os.rename(os.path.join(recordings_dir, file), os.path.join(recordings_dir, file.replace(".processing", "")))
        print(f"Renamed {file} to {file.replace('.processing', '')}")

def notify_sock(title, key, sock):
    # Send a notification to the frontend
    sock.emit("notify", [str(datetime.now()), title, key])
    print(title)

def date_to_iso(date: datetime):
    return date.replace(microsecond=0).isoformat() + 'Z'

def iso_to_date(date: str):
    return datetime.fromisoformat(date.replace('Z', '+00:00'))