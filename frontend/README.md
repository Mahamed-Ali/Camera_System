# Security Camera

A security camera running on a Raspbery Pi Zero with a web interface to view the camera feed and control the camera.

## Tech Stack
- Python + Flask, TensorFlow lite, ~~OpenCV~~
- React + components
- Typescript
- SCSS (CSS nesting lucks support from some mobile https://caniuse.com/css-nesting)
- SQLite

## Running
Run Flask server and react app simultaneously.  
Flask server will run locally on port 5000, changeable in `./backend/main.py`.  
React app using Vite will run on port 5173, configurable in `vite.config.ts`.  
`nohup` or `tmux` might be useful.