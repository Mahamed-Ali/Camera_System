import cv2
import numpy as np
import os
import logging

from enum import Enum
from time import sleep
from threading import Thread, Lock
from datetime import datetime
from typing import Callable
from options import options
from os import path, rename, remove
from config import NOT_USING_PYCAMERA, recordings_dir, static_folder
from utils import append_log, clean_filename, iso_to_date
from apscheduler.schedulers.background import BackgroundScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
log = logging.getLogger("CameraSystem")

class RecordingsType(Enum):
    """Enumeration for the type of recording"""
    SCHEDULED_CLIP = "scheduled"
    MOTION_CLIP = "motion"
    MANUAL = "manual"

class Camera:
    def __init__(self, testing_env=False):
        self.testing_env = testing_env
        # Internal resolution, might be options.resolution or options._default_res
        # options.resolution can be unset, and may not reflect the actual frame resolution
        self.resolution = options.resolution
        self.resolution_chnaged = False
        self.capcam: cv2.VideoCapture = None
        self.on_resume: Callable = None
        self.paused = False
        self.inform: Callable = None
        self.notify: Callable = None
        # OpenCV frame difference method will be used for motion detection
        # if the PIR sensor is not available
        self.using_pir_sensor = False
        self.rec_sched_ids = ()
        self.scheduler = BackgroundScheduler()
        self.recordings = {
            # If a value is empty, it means that the recording of type is not in progress
            # The value is an iterable containing the filename, video writer object, and frame count
            RecordingsType.MANUAL: [],
            RecordingsType.SCHEDULED_CLIP: [],
            RecordingsType.MOTION_CLIP: [],
        }
        self.recording_lock = Lock()
        log.info("Camera system initialized.")

    def __call__(self):
        return self.capcam

    def init_cam(self, width=None, height=None):
        retry_count = 0
        while retry_count < 5:
            try:
                if not (width and height):
                    width, height = options.resolution
                if self.testing_env:
                    self.capcam and self.capcam.release()
                    self.capcam = cv2.VideoCapture(0)
                    self.capcam.set(cv2.CAP_PROP_FRAME_WIDTH, width)
                    self.capcam.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
                    self.resolution = width, height
                    if self.capcam is None or not self.capcam.isOpened():
                        log.error("[DEBUG] Could not open USB camera 0! Is a webcam connected?")
                        raise Exception("Error: Could not open USB camera 0, is a webcam connected? Unset NOT_USING_PYCAMERA to use Picamera2")
                    log.info(f"Camera initialized at {width}x{height}")
                    if not hasattr(self, 'bg_thread') or not self.bg_thread.is_alive():
                        self.bg_thread = Thread(target=self.background_capture_loop, daemon=True)
                        self.bg_thread.start()
                    return self
                # Picamera2 module is used for Raspberry Pi camera module
                if not self.capcam:
                    from picamera2 import Picamera2
                    self.capcam = Picamera2()
                else:
                    self.capcam.stop()
                print(f"Camera resolution set to {width}x{height}")
                self.capcam.configure(self.capcam.create_video_configuration(main={"size": (width, height)}))
                self.capcam.start()
                self.resolution = width, height
                log.info(f"Camera initialized at {width}x{height}")
                if not hasattr(self, 'bg_thread') or not self.bg_thread.is_alive():
                    self.bg_thread = Thread(target=self.background_capture_loop, daemon=True)
                    self.bg_thread.start()
                return self
            except Exception as e:
                log.error(f"Camera init failed: {e}")
                retry_count += 1
                sleep(2)
        raise Exception("Camera failed to initialize after retries.")

    def capture(self):
        if not self.testing_env:
            frame = self.capcam.capture_array()
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            return True, frame
        else:
            ret, frame = self.capcam.read()
            if not ret:
                # Probably reached the end of the video if playing from a file
                self.capcam.set(cv2.CAP_PROP_POS_FRAMES, 0)
            return ret, frame
    def release(self):
        if not self.testing_env:
            self.capcam.stop()
        else:
            self.capcam.release()

    def set_resolution(self, width=None, height=None):
        if not (width and height):
            # Reset to default resolution if no arguments are provided
            width, height = options._default_res

        # Stop recording if in progress
        self.stop_recording()

        # Pause reading frames to avoid issues
        self.pause(user_initiated=False)
        # It's better to release the camera and reinitialize it with the new resolution
        # as changing resolution on the fly with resize() will still capture frames at the old resolution
        self.init_cam(width, height)
        self.unpause(user_initiated=False)
        return width, height

    def pause(self, user_initiated=True, reason="Temporarily paused"):
        self.inform('paused' if user_initiated else 'system-pause', reason)
        self.paused = True
    
    def unpause(self, user_initiated=True):
        self.inform('paused' if user_initiated else 'system-pause', False)
        self.paused = False

    def toggle_pause(self):
        self.unpause() if self.paused else self.pause()

    def start_recording(self, type=RecordingsType.MANUAL, notify=True, rec_type="recording247"):
        # إذا كان هناك تسجيل نشط من نفس النوع، أوقفه أولًا
        if self.recordings.get(type):
            log.warning(f"Recording type {type} already in progress. Stopping previous recording.")
            self.stop_recording(type)
        for codec_name in ["mp4v", "XVID", "avc1"]:
            codec = cv2.VideoWriter_fourcc(*codec_name)
            filename = path.join(recordings_dir, f"{datetime.now():%Y-%m-%d_%H-%M-%S}.{type.value}.processing.mp4")
            writer = cv2.VideoWriter(filename, codec, 20, self.resolution)
            if writer.isOpened():
                log.info(f"[DEBUG] VideoWriter opened with codec {codec_name} for {filename}")
                break
            else:
                log.error(f"[DEBUG] VideoWriter failed to open with codec {codec_name} for {filename}")
        else:
            log.error(f"[DEBUG] All codecs failed for {filename}. Recording will not work!")
            return "VideoWriter failed to open"
        self.recordings[type] = [filename, writer, 0]  # Add frame count
        self.inform('recording', True)
        print(f"Recording {type.value} to {filename}", self.recordings)
        log.info(f"[MANUAL] Started recording: {filename}")
        if notify:
            self.notify((type.value.replace(RecordingsType.MANUAL.value, "24/7")).capitalize() + " recording started", rec_type)
        log.info(f"Started recording: {filename}")

    def stop_recording(self, type=None, rm_type=True, rec_type="recording247"):
        log.info(f"[DEBUG] stop_recording CALLED with type={type}, rm_type={rm_type}, rec_type={rec_type}")
        if type is None:
            for rec_type in RecordingsType:
                if self.recordings.get(rec_type):
                    self.stop_recording(rec_type)
            log.info(f"[DEBUG] stop_recording: All recordings stopped.")
            return
        if not self.recordings.get(type):
            log.warning(f"[MANUAL] Tried to stop recording {type} but none in progress.")
            return print("Recording type not in progress")
        filename, writer, frame_count = self.recordings[type]
        new_name = clean_filename(filename)
        with self.recording_lock:
            writer: cv2.VideoWriter
            writer.release()
            try:
                rename(filename, new_name)
            except Exception as e:
                log.error(f"[DEBUG] Failed to rename {filename} to {new_name}: {e}")
        MIN_FRAMES = 10
        if frame_count < MIN_FRAMES or not os.path.exists(new_name):
            if os.path.exists(new_name):
                os.remove(new_name)
            if rm_type:
                del self.recordings[type]
            print(f"Recording {new_name} discarded (too short or empty)")
            log.warning(f"[MANUAL] Recording {new_name} discarded (too short or empty)")
            log.info(f"[DEBUG] stop_recording: Recording {type} discarded.")
            return
        if rm_type:
            del self.recordings[type]
        self.inform('recording', False)
        self.notify((type.value.replace(RecordingsType.MANUAL.value, "24/7")).capitalize() + " recording done", rec_type)
        log.info(f"[DEBUG] stop_recording: Recording {type} stopped and file saved.")
        import moviepy.editor as moviepy
        import multiprocessing
        clip = moviepy.VideoFileClip(new_name)
        num_cores = multiprocessing.cpu_count()
        clip.write_videofile(new_name + ".tmp.mp4", codec='libx264', threads=num_cores, preset='ultrafast')
        clip.close()
        remove(new_name)
        rename(new_name + ".tmp.mp4", new_name)
        log.info(f"[MANUAL] Stopped recording: {new_name}, frames written: {frame_count}")
        if frame_count < MIN_FRAMES or not os.path.exists(new_name):
            log.warning(f"Recording {new_name} was too short or empty and was deleted.")
        else:
            log.info(f"Recording {new_name} saved successfully.")
        # تحديث recordings.json بعد حفظ الفيديو
        try:
            import json
            json_path = os.path.join('frontend/public/recordings', 'recordings.json')
            if os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = []
            # أضف الفيديو إذا لم يكن موجودًا
            base_name = os.path.basename(new_name)
            if not any(rec.get('name') == base_name for rec in data):
                # استخراج معلومات الفيديو
                size_mb = round(os.path.getsize(new_name) / 1_000_000, 2)
                cap = cv2.VideoCapture(new_name)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                duration = round(frame_count / fps, 1) if fps > 0 else 0
                cap.release()
                data.append({
                    'name': base_name,
                    'url': f"/recordings/{base_name}",
                    'date': str(datetime.now().strftime('%Y-%m-%d %H:%M')),
                    'duration': f"{duration}s",
                    'size': f"{size_mb} MB"
                })
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            log.error(f"Failed to update recordings.json: {e}")

    def start_motion_recording(self):
        if self.recordings.get(RecordingsType.MOTION_CLIP):
            return "Motion recording is already in progress"

        self.start_recording(RecordingsType.MOTION_CLIP, notify=False)
        filename = clean_filename(path.basename(self.recordings[RecordingsType.MOTION_CLIP][0]))

        if options.logging:
            # Log after recording has started to avoid logging if recording fails to start
            log_data = append_log("motion", "Motion detected.", f"Motion detected and {options.motionrecordto} seconds of it recorded to {filename}")
            self.inform("new-log", log_data)

        # Start a timer thread to stop recording after $options.motionrecordto seconds
        Thread(target=self.stop_recording_after_delay, args=(options.motionrecordto,)).start()
        self.notify(f"Recording motion for {options.motionrecordto}s", "motion")

    def stop_recording_after_delay(self, delay):
        # Wait for the specified delay
        sleep(delay)

        # Stop recording
        cam_utils.stop_recording(RecordingsType.MOTION_CLIP, rm_type=False, rec_type="motion")

        # Wait for options.motionwait before allowing motion detection again
        self.notify(f"Motion detection cooling for {options.motionwait}s", "motion")
        sleep(options.motionwait)
        del self.recordings[RecordingsType.MOTION_CLIP]
        # self.notify("Motion detection resumed", "motion")

    def start_scheduled_recording(self, start_time, end_time):
        self.start_recording(RecordingsType.SCHEDULED_CLIP, notify=False)
        filename = clean_filename(path.basename(self.recordings[RecordingsType.SCHEDULED_CLIP][0]))

        if options.logging:
            log_data = append_log("schedule", "Scheduled recording started.", f"Scheduled recording started at {start_time} and will end at {end_time}. Recording to {filename}")
            self.inform("new-log", log_data)

        self.notify(f"Scheduled recording started", "schedule")

    def stop_scheduled_recordings(self, notify=True):
        # Remove scheduled recording jobs
        # for id_ in self.rec_sched_ids:
        #     print("Removing job", id_)
        #     self.scheduler.remove_job(id_)

        # End all jobs if there are any
        if self.scheduler.get_jobs():
            self.scheduler.shutdown(wait=False)
            
        # Empty to indicate that there is no scheduled recording
        self.rec_sched_ids = ()

        # Stop recording
        self.stop_recording(RecordingsType.SCHEDULED_CLIP, rm_type=False, rec_type="schedule")
        notify and self.notify(f"Scheduled recording done", "schedule")

    def setup_scheduled_recording(self, start: datetime, end: datetime):
        if not (start and end):
            return "Invalid schedule"
        
        start = iso_to_date(start) if type(start) == str else start
        end = iso_to_date(end) if type(end) == str else end

        if self.rec_sched_ids:
            # Remove previous scheduled recording
            self.stop_scheduled_recordings()

        self.rec_sched_ids = ["scheduled-recording", "scheduled-recording-end"]
        self.scheduler.add_job(self.start_scheduled_recording, 'date', run_date=start, args=(start, end), id=self.rec_sched_ids[0])
        self.scheduler.add_job(self.stop_scheduled_recordings, 'date', run_date=end, id=self.rec_sched_ids[1])

        if self.scheduler.state == 0:
            self.scheduler.start()
        

    def detect_motion(self, frame, frist_gray_frame):
        # https://pyimagesearch.com/2015/05/25/basic-motion-detection-and-tracking-with-python-and-opencv/
        gray2 = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.GaussianBlur(gray2, (21, 21), 0)

        # Calculate the difference between the two frames.
        delta_frame = cv2.absdiff(frist_gray_frame, gray2)

        # Threshold the delta frame.
        thresh = cv2.threshold(delta_frame, 100, 255, cv2.THRESH_BINARY)[1]

        # Dilate the thresholded image to fill in holes.
        thresh = cv2.dilate(thresh, None, iterations=2)

        # Find contours to detect the moving parts.
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            if cv2.contourArea(contour) < options.contourareathreshold:
                continue  # Too small

            # (x, y, w, h) = cv2.boundingRect(contour)
            # cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            log.info("Motion detected! Starting recording...")
            self.start_motion_recording()
            return gray2.copy()
        
        return gray2.copy()

    def match_option(self, key, value):
        log.info(f"[DEBUG] match_option CALLED with key={key}, value={value}")
        """
        Check if the key matches any of the options, perform the necessary action if possible,
        and return message title and description of the action performed/will be performed.
        """

        successful = True

        # Structural pattern matching not available below Python 3.10 😔 (https://peps.python.org/pep-0636/).
        if key == 'resolution' and not value:
            self.set_resolution(*options._default_res)
            title, desc = "Resolution set to default", f"Camera resolution automatically set to {'x'.join(map(str, options._default_res))}"
            self.resolution_chnaged = True
        elif key == 'resolution' and value != options.resolution:
            self.set_resolution(*value)
            title = "Camera resolution updated"
            if self.testing_env:
                # OpenCV might set resolution it to nearest resolution if the camera does not support the exact resolution
                # https://stackoverflow.com/a/62019070. Should be fine for testing purposes. Picamera2 is more versatile.
                desc = f"Set supported resolution closest to {'x'.join(map(str, value))}"
            else:
                # Pycamera2 should is more versatile, but very low values could cause issues
                if any(v < 100 for v in value):
                    title, desc, successful = "Invalid resolution", "Resolution must be at least 100x100", False
        elif key == 'recording247':
            if value:
                msg = self.start_recording()
                from options import options as _options
                _options.update_option('recording247', True)
                _options.reload()
                title, desc, successful = ("Recording error", msg, 0) if msg else ("Recording on", "24/7 recording enabled", 1)
            else:
                msg = self.stop_recording(RecordingsType.MANUAL, rec_type="recording247")
                from options import options as _options
                _options.update_option('recording247', False)
                _options.reload()
                title, desc, successful = ("Recording off", "24/7 recording disabled", 1)
        elif key == 'fliporientation':
            # Some options just need to be toggled, which is done where this function is called, so we just return the title and description
            title = "Camera " + ("flipped" if value else "unflipped")
            desc = "Camera orientation " + ("flipped" if value else "set to normal")
        elif key == 'logging':
            title, desc = f"Logging {'enabled' if value else 'disabled'}", f"Activity logging turned {'on' if value else 'off'}"
        elif key == 'linelimit' and value != options.linelimit and value > 0:
            title, desc = "Log limit updated", f"Updated max number of lines in log file to {value}"
        elif key == 'linelimit' and value != options.linelimit and value == 0:
            title, desc = "Log limit disabled", f"Disabled log file line limit"
        elif key == 'motionwait' and value != options.motionwait and value > 0:
            title, desc = "Motion detection cooldown updated", f"Updated motion detection cooldown to {value} seconds"
        elif key == 'motionwait' and value != options.motionwait and value == 0:
            title, desc = "Motion cooldown disabled", f"Disabled motion detection cooldown"
        elif key == 'schedule' and value:
            msg = self.setup_scheduled_recording(value.get('date', {}).get('from'), value.get('date', {}).get('to'))
            title, desc, successful = ("Schedule error", msg, 0) if msg else ("Recording scheduled", f"Automatic recording set at {value.get('date', {}).get('from')} to {value.get('date', {}).get('to')}", 1)
        elif key == 'schedule':
            # Remove previous scheduled recording
            msg = self.stop_scheduled_recordings(notify=False)
            title, desc, successful = ("Schedule error", msg, 0) if msg else ("Recording unscheduled", f"Automatic recording unscheduled", 1)
        elif key == 'shape' and value:
            title, desc = "Added privacy zone", f"Privacy zone shape added"
        elif key == 'shape':
            title, desc = "Removed privacy zone", f"Privacy zone shape removed"
        elif key == 'motiondetection':
            title, desc = f"Motion detection {'enabled' if value else 'disabled'}", f"Motion detection is turned {'on' if value else 'off'}"
        else:
            title = desc = None

        # Returning title and description if there was a match
        return (title, desc, key, successful) if desc else None

    def blend_colour_with_frame(self, frame_roi, colour, alpha):
        # Create a coloured overlay
        overlay = np.full(frame_roi.shape, colour, dtype=np.uint8)
        
        # Blend the overlay with the frame ROI
        cv2.addWeighted(overlay, alpha, frame_roi, 1 - alpha, 0, frame_roi)
        
        return frame_roi

    def add_privacy_shape(self, frame, shape_attributes):
        # Calculate absolute dimensions based on relative shape attributes
        height, width = frame.shape[:2]
        abs_x = int(shape_attributes['x'] * width / 100)
        abs_y = int(shape_attributes['y'] * height / 100)
        abs_width = int(shape_attributes['width'] * width / 100)
        abs_height = int(shape_attributes['height'] * height / 100)
        
        # Create a mask where the shape is located
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.rectangle(mask, (abs_x, abs_y), (abs_x + abs_width, abs_y + abs_height), 255, -1)

        # Only apply the Gaussian blur if the blur value is greater than 0
        if shape_attributes['blur'] > 0:
            blurred_frame = cv2.GaussianBlur(frame, (0, 0), max(shape_attributes['blur'] - 3, 1))
        else:
            blurred_frame = frame

        # Combine the blurred frame and the original frame using the mask
        combined = np.where(mask[:, :, None], blurred_frame, frame)

        # Extract the ROI from the combined frame
        combined_roi = combined[abs_y:abs_y+abs_height, abs_x:abs_x+abs_width]

        # Convert HSVA to BGR and apply the alpha channel
        hsva = shape_attributes['hsva']
        colour = cv2.cvtColor(np.uint8([[[
            hsva['h'] / 360 * 179,  # OpenCV Hue range is from 0 to 179 for 8-bit images
            hsva['s'] / 100 * 255,
            hsva['v'] / 100 * 255
        ]]]), cv2.COLOR_HSV2BGR)[0][0].tolist()
        alpha = hsva['a']

        # Blend the coloured overlay with the blurred ROI
        combined_roi = self.blend_colour_with_frame(combined_roi, colour, alpha)

        # Place the blended ROI back into the combined frame
        combined[abs_y:abs_y+abs_height, abs_x:abs_x+abs_width] = combined_roi
        
        return combined

    def background_capture_loop(self):
        _, first_frame = self.capture()
        frist_gray_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        frist_gray_frame = cv2.GaussianBlur(frist_gray_frame, (21, 21), 0)
        while True:
            try:
                if self.paused:
                    sleep(0.1)
                    continue
                ret, frame = self.capture()
                if not ret:
                    log.error("[DEBUG] No frame captured from camera!")
                    sleep(0.1)
                    continue
                else:
                    log.info("[DEBUG] Frame captured from camera.")
                # (Optional) Add privacy, flip, etc. if needed
                if options.shape:
                    hsva = options.shape['hsva']
                    hsva_adjusted = {
                        **hsva,
                        's': hsva['s'] * 70,
                        'v': hsva['v'] * 1.5,
                    }
                    try:
                        frame = self.add_privacy_shape(frame, {**options.shape, 'hsva': hsva_adjusted})
                    except Exception as e:
                        log.error(f"Privacy zone blur failed: {e}")
                if options.fliporientation:
                    frame = cv2.flip(frame, -1)
                with self.recording_lock:
                    for rec_type, recording in self.recordings.items():
                        if recording:
                            recording[1].write(frame)
                            recording[2] += 1
                            log.info(f"[DEBUG] Frame written to {recording[0]}")
                            if recording[2] == 1:
                                log.info(f"First frame written to {recording[0]}")
                sleep(1/20)  # match FPS
            except Exception as e:
                log.error(f"Error in background_capture_loop: {e}")
                sleep(1)

    def gen_frames(self):
        _, first_frame = self.capture()
        frist_gray_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        frist_gray_frame = cv2.GaussianBlur(frist_gray_frame, (21, 21), 0)
        while not self.paused:
            try:
                ret, frame = self.capture()
                if not ret:
                    log.warning("Failed to capture frame from camera.")
                    continue
                # (Optional) Motion detection, privacy, flip, etc. as before
                if options.motiondetection and not self.paused and not self.using_pir_sensor:
                    if self.resolution_chnaged:
                        frist_gray_frame = cv2.resize(frist_gray_frame, self.resolution)
                        self.resolution_chnaged = False
                    frist_gray_frame = self.detect_motion(frame, frist_gray_frame.copy())
                if options.shape:
                    hsva = options.shape['hsva']
                    hsva_adjusted = {
                        **hsva,
                        's': hsva['s'] * 70,
                        'v': hsva['v'] * 1.5,
                    }
                    try:
                        frame = self.add_privacy_shape(frame, {**options.shape, 'hsva': hsva_adjusted})
                    except Exception as e:
                        log.error(f"Privacy zone blur failed: {e}")
                if options.fliporientation:
                    frame = cv2.flip(frame, -1)
                # Remove frame writing from here (now handled by background thread)
                self.resolution = frame.shape[:2][::-1]
                ret, buffer = cv2.imencode('.jpg', frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            except Exception as e:
                log.error(f"Error in gen_frames loop: {e}")
                sleep(1)


# testing_env is True when running on a non-Raspberry Pi environment and thus using a usb webcam instead of Picamera
cam_utils: Camera = Camera(testing_env=NOT_USING_PYCAMERA).init_cam()

# Setup motion detection using a PIR sensor if available
if cam_utils.using_pir_sensor:
    from gpiozero import MotionSensor
    from os import getenv

    # The PIR sensor is connected to the GPIO pin 4
    # Pin numbering: https://gpiozero.readthedocs.io/en/latest/recipes.html#pin-numbering
    pir = MotionSensor(getenv("PIR_PIN", 4))

    def on_motion():
        # print("Motion detected", cam_utils.paused,  not options.motiondetection)
        if cam_utils.paused or not options.motiondetection: return
        log_data = append_log("motion", "Motion detected.", "Motion detected by PIR sensor. Recording started")
        cam_utils.start_recording(RecordingsType.MOTION_CLIP)
        cam_utils.inform("new-log", log_data)

    def on_no_motion():
        # print("No motion detected", cam_utils.recording_type, RecordingsType.MOTION_CLIP)
        cam_utils.inform("Motion stopped", "Motion stopped. Recording stopped")
        if cam_utils.recording_type == RecordingsType.MOTION_CLIP:
            cam_utils.stop_recording(RecordingsType.MOTION_CLIP)


    pir.when_motion = on_motion
    pir.when_no_motion = on_no_motion

# Clean up broken files on startup
for file in os.listdir(recordings_dir):
    if file.endswith('.mp4'):
        file_path = os.path.join(recordings_dir, file)
        cap = cv2.VideoCapture(file_path)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        cap.release()
        if frames < 10:
            os.remove(file_path)
            print(f"Deleted broken recording: {file}")
