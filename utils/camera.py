import cv2
import numpy as np

from enum import Enum
from time import sleep
from threading import Thread
from datetime import datetime
from typing import Callable
from options import options
from os import path, rename, remove
from config import NOT_USING_PYCAMERA, recordings_dir, static_folder
from utils import append_log, clean_filename, iso_to_date
from apscheduler.schedulers.background import BackgroundScheduler

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
            # The value is an iterable containing the filename and video writer object
            RecordingsType.MANUAL: [],
            RecordingsType.SCHEDULED_CLIP: [],
            RecordingsType.MOTION_CLIP: [],
        }

    def __call__(self):
        return self.capcam

    def init_cam(self, width=None, height=None):
        if not (width and height):
            width, height = options.resolution

        if self.testing_env:
            self.capcam and self.capcam.release()
            # self.capcam = cv2.VideoCapture(static_folder + "/test-video-greece.mp4")
            self.capcam = cv2.VideoCapture(0)
            self.capcam.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            self.capcam.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            self.resolution = width, height
            
            if self.capcam is None or not self.capcam.isOpened():
                exit("Error: Could not open USB camera 0, is a webcam connected? Unset NOT_USING_PYCAMERA to use Picamera2")

            return self

        # Picamera2 module is used for Raspberry Pi camera module
        # Manual: https://datasheets.raspberrypi.com/camera/picamera2-manual.pdf
        if not self.capcam:
            # Module might not be installed on non-Raspberry Pi environments
            from picamera2 import Picamera2

            self.capcam = Picamera2()
        else:
            self.capcam.stop()

        print(f"Camera resolution set to {width}x{height}")
        self.capcam.configure(self.capcam.create_video_configuration(main={"size": (width, height)}))
        self.capcam.start()
        self.resolution = width, height

        return self

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
        # No need to start recording if it's already in progress
        if self.recordings.get(type):
            return "Recording type in progress"
        
        codec = cv2.VideoWriter_fourcc(*"mp4v")
        filename = path.join(recordings_dir, f"{datetime.now():%Y-%m-%d_%H-%M-%S}.{type.value}.processing.mp4")
        writer = cv2.VideoWriter(filename, codec, 20, self.resolution)
        self.recordings[type] = filename, writer
        self.inform('recording', True) # Inform frontend
        print(f"Recording {type.value} to {filename}", self.recordings)

        if notify:
            self.notify((type.value.replace(RecordingsType.MANUAL.value, "24/7")).capitalize() + \
                # f" recording started to {path.basename(clean_filename(filename))}", log_type)
                " recording started", rec_type)

    def stop_recording(self, type=None, rm_type=True, rec_type="recording247"):
        if type is None:
            for type in RecordingsType:
                if self.recordings.get(type):
                    self.stop_recording(type)
            return
        
        if not self.recordings.get(type):
            return print("Recording type not in progress")

        filename, writer = self.recordings[type]

        # Rename the file to remove the 'processing' suffix etc.
        new_name = clean_filename(filename)
        rename(filename, new_name)
        
        writer: cv2.VideoWriter
        writer.release()
        
        if rm_type:
            del self.recordings[type]

        self.inform('recording', False)
        self.notify((type.value.replace(RecordingsType.MANUAL.value, "24/7")).capitalize() + \
                # f" recording started to {path.basename(clean_filename(filename))}", log_type)
                " recording done", rec_type)

        # Convert all .mp4v files to Browser-compatible .mp4 files
        import moviepy.editor as moviepy
        import multiprocessing

        # Load the video file
        clip = moviepy.VideoFileClip(new_name)

        # Get the number of CPU cores
        num_cores = multiprocessing.cpu_count()
        
        # clip.write_videofile(new_name + ".tmp.mp4", codec='libx264')
        clip.write_videofile(new_name + ".tmp.mp4", codec='libx264', threads=num_cores, preset='ultrafast')
        clip.close()

        # Old file is no longer needed
        remove(new_name)
        rename(new_name + ".tmp.mp4", new_name)


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
            self.start_motion_recording()
            return gray2.copy()
        
        return gray2.copy()

    def match_option(self, key, value):
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
            msg = self.start_recording() if value else self.stop_recording(RecordingsType.MANUAL)
            title, desc, successful = ("Recording error", msg, 0) if msg else (f"Recording {'on' if value else 'off'}", f"24/7 recording {'enabled' if value else 'disabled'}", 1)
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

    def gen_frames(self):

        _, first_frame = self.capture()
        frist_gray_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        frist_gray_frame = cv2.GaussianBlur(frist_gray_frame, (21, 21), 0)

        while not self.paused:
            # Capture frame-by-frame
            ret, frame = self.capture()

            if not ret:
                continue

            # If self.motion_sensor is enabled, detection should be done by IR sensor at the bottom
            if options.motiondetection and not self.paused and not self.using_pir_sensor:
                if self.resolution_chnaged:
                    # If the resolution has changed, the frame shape must be updated
                    frist_gray_frame = cv2.resize(frist_gray_frame, self.resolution)
                    self.resolution_chnaged = False
                frist_gray_frame = self.detect_motion(frame, frist_gray_frame.copy())

            # If shape is defined, apply the backdrop blur effect
            if options.shape:
                # Adjust HSV values slightly to make them more vibrant to match with browser preview
                hsva = options.shape['hsva']
                hsva_adjusted = {
                    **hsva,
                    's': hsva['s'] * 70,
                    'v': hsva['v'] * 1.5,
                }

                # Apply the blur to the region specified by the shape
                frame = self.add_privacy_shape(frame, {**options.shape, 'hsva': hsva_adjusted})

            # Flip the upside down if enabled
            if options.fliporientation:
                frame = cv2.flip(frame, -1)

            # Write the frame to all recording files
            # for _, writer in self.recordings.values():
                # writer.write(frame)
            
            # Write the frame to all recording files
            for recording in self.recordings.values():
                if recording:
                    recording[1].write(frame)
                
            # Store last frame shape as options.resolution may not be the actual frame shape
            self.resolution = frame.shape[:2][::-1]

            # Encode the frame in JPEG format
            ret, buffer = cv2.imencode('.jpg', frame)

            # Convert to bytes and yield the frame
            frame = buffer.tobytes()
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


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
