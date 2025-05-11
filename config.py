from os import getenv, path, makedirs
from flask import Flask
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

static_folder = path.abspath("frontend/public")
log_file = path.join(static_folder, "activitylogs.csv")
options_file = path.join(static_folder, "options.json")
recordings_dir = path.abspath("frontend/public/recordings")

# Make sure recordings directory exists
makedirs(recordings_dir, exist_ok=True)

# Make sure activity logs file exists
with open(log_file, 'a'):
    pass

# Set up camera constants
# NOT_USING_PYCAMERA = getenv('NOT_USING_PYCAMERA', False)
NOT_USING_PYCAMERA = True
testing_environment = NOT_USING_PYCAMERA

app = Flask(__name__, static_folder=static_folder, static_url_path='/')
CORS(app)