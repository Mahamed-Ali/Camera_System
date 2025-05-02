from subprocess import call
from datetime import datetime
from flask_socketio import SocketIO
from utils import notify_sock
from utils.camera import cam_utils
from utils import append_log, setup_autostart
from config import app, log_file, testing_environment
from options import options

# Initialise Flask-SocketIO (cors_allowed_origins='*' doesn't seem to want to behave)
socketio = SocketIO(app, cors_allowed_origins='*', engineio_logger=True)

@socketio.on('connect')
def connect():
    print('Socket client connected')
    socketio.emit('yo', 'Greetings')

@socketio.on('disconnect')
def disconnect():
    print('Socket client disconnected')

@socketio.on('pause')
def pause_feed():
    cam_utils.toggle_pause()

@socketio.on('poweroff')
def handle_poweroff():
    # Stop recording if in progress
    cam_utils.stop_recording()
    
    # Log shutdown to activity logs if logging is enabled
    if options.logging:
        log_data = append_log("poweroff", "System shutdown", "System shutdown initiated by user")
        socketio.emit("new-log", log_data)
        cam_utils.pause(False, "Camera is offline")

    # Finally, R.I.P.
    socketio.emit('inform', {"title": "Good bye", "description": "Powering off, good bye"})
    call("sudo shutdown -h now", shell=True)

@socketio.on('reboot')
def handle_reboot():
    # Stop recording if in progress
    cam_utils.stop_recording()
    
    try:
        # Setup systemd service
        setup_autostart()
    
        # Log reboot to activity logs if logging is enabled
        if options.logging:
            log_data = append_log("reboot", "System reboot", "System reboot initiated by user")
            socketio.emit("new-log", log_data)
            cam_utils.pause(False, "Camera is offline")

        socketio.emit('inform', {"title": "Rebooting", "description": "See you in a bit 🫡"})
        
        # call("sudo reboot", shell=True) if not testing_environment else print("Not rebooting in testing environment")
        call("sudo reboot", shell=True)
    except Exception as e:
        socketio.emit('inform', {"title": "Error rebooting", "description": str(e)})
        print("Error rebooting system:", e)

@socketio.on('option-update')
def handle_camera_option_change(key, value):
    if key not in options.get_options() and key != 'bulk':
        socketio.emit('inform', {"title": "Invalid option", "description": f"Option '{key}' does not exist"})
        return
    
    messages, errors, no_save = [], [], []

    if key == 'bulk':
        # 'bulk' option means the value is a dictionary of multiple options
        for k, v in value.items():
            matched = cam_utils.match_option(k, v)
            if matched:
                messages.append(matched)
                not matched[3] and no_save.append(k)
    else:
        # Single option change
        matched = cam_utils.match_option(key, value)
        if matched:
            messages.append(matched)
            not matched[3] and no_save.append(key)

    # No messages means no match, so no change needs to be made
    if not messages:
        return

    if key == 'bulk':
        # Update each option in the dictionary with corresponding value
        for k, v in value.items():
            if k not in no_save:
                errored = options.update_option(k, v)
                if errored:
                    errors.append((f"Error updating {k}", errored))
                    continue # Not breaking as there might be other options that can be updated
    elif key not in no_save:
        errored = options.update_option(key, value)
        if errored:
            errors.append((f"Error updating {key}", errored))

    socketio.emit('inform', {"data": messages + errors})

    for title, description, key, _ in messages:
        # Should also make a last log that logs are disabled if this event disables logging
        if options.logging or key == 'logging':
            log_data = append_log(key, title, description)
            socketio.emit("new-log", log_data)

        if key not in ('recording247', 'motiondetection'):
            # Recording and motion detection are logged separately
            # in cam_utils.start_recording()
            notify_sock(title, key, socketio)

@socketio.on('clear-logs')
def handle_clear_logs():
    with open(log_file, 'w'):
        socketio.emit('new-log', None)
        notify_sock("Logs cleared", "logging", socketio)

@socketio.on('yo, you alive?')
def handle_alive():
    # Confirm that the server is alive and sent time to sync with client
    socketio.emit('alive and not kicking because I have not legs', str(datetime.now()))