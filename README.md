# Video surveillance system

<details open>
	<summary>Screenshots</summary><br />
	<img src="https://github.com/user-attachments/assets/a5f039bb-728c-4749-bb6c-5de77fe29c31" alt="Screenshot from 2024-07-26 00-27-32" /><br />
	<img src="https://github.com/user-attachments/assets/21f17696-64f2-41c2-9243-6776518a3fd6" alt="Screenshot from 2024-07-26 00-27-06" /><br />
	<!-- ![Screenshot from 2024-07-26 00-27-32](https://github.com/user-attachments/assets/a5f039bb-728c-4749-bb6c-5de77fe29c31) -->
	<!-- ![Screenshot from 2024-07-26 00-27-06](https://github.com/user-attachments/assets/21f17696-64f2-41c2-9243-6776518a3fd6) -->
</details>

This was originally a personal project I have decided to open source, so not everything is set up perfectly for public use and not everything is documented. This project is a security camera system that was intended to be used with some kind of micro or single board computer like a Raspberry Pi (I use a Raspberry Pi Zero 2 W with a camera module), but it can also run on a regular computer (if `NOT_USING_PYCAMERA` environment variable is set).

The backend is a Flask server with the ability to stream video either from a PiCamera or a USB webcam. The frontend is a React app that connects to the Flask server to view the video stream and control the camera.  

## Features:
- **Camera Compatibility**: Works with Raspberry Pi camera modules and USB webcams.
- **Motion Detection**: Can use PIR motion sensor for motion detection when set or otherwise OpenCV-based frame differencing.
- **Dashboard**:
	- A nice looking dashboard (counts according to me).
	- Live video feed monitoring.
	- Settings configuration.
	- Access to recorded footage.
- **Customisation Options**:
	- **Camera Orientation**: Flip video feed upside-down.
	- **Resolution Adjustment**: Adjust camera resolution.
	- **Motion Detection Sensitivity**: Customise motion detection sensitivity.
	- **Motion Detection Zones**: Define areas to monitor for motion.
	- **Motion Detection Notifications**: Receive notifications when motion is detected.
	- **Privacy Zone Configuration**: Blur sensitive areas in the video feed.
	- **Video Recording Settings**: Configure video recording settings.
  - **...and more.**
- **Power Management Options**:
	- Power off and restart the device from the interface (when NOT_USING_PYCAMERA is unset).
- **Video Playback and Management**:
	- View, download, or delete video recordings.
	- Dedicated section for video management with thumbnails and playback icons.
	- Labels for video status.
- **Privacy-Focused Features**:
	- Privacy zone shape to blur sensitive areas.
- **Event Logging and Notification**:
	- Comprehensive activity log for events like motion detection and user actions.
	- Customisable notification triggers.
- **Web Interface and User Experience**:
	- Responsive design for different screen sizes.
	- Efficient for resource-constrained devices.
- **Additional Features**:
	- Component-based architecture for scalability and modularity.

# Setup Flask and run backend
```sh
pip install -r requirements.txt

# NOT_USING_PYCAMERA must be set when not running on device with PiCamera like a Raspberry Pi with camera module
# When NOT_USING_PYCAMERA is set, camera 0 or /dev/video0 will be used
export NOT_USING_PYCAMERA=true && python app.py
# PowerShell: $env:NOT_USING_PYCAMERA="true"; python app.py
# CMD: set NOT_USING_PYCAMERA=true && python app.py
```

<!-- # Setup and run React frontend for development
```sh
cd frontend
npm install
npm start
``` -->

Still a work in progress.
