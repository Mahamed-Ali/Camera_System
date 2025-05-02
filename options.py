from config import options_file
from json import dump, load

class Options:
    def __init__(self):
        self.logging = False
        self.linelimit: int = 0
        self.recording247 = False
        self.motiondetection = False
        self.fliporientation = False
        self.shape: dict = None
        self.schedule: dict = None
        self.motionwait: int = 5 # seconds
        self.motionrecordto: int = 10 # seconds
        self.contourareathreshold = 3000 # roughly thumb size?
        self._default_res = 640, 480
        self.resolution = self._default_res
        # The above options above can be overridden by options file
        # Done below 👇

        try:
            # Load options from file
            with open(options_file) as f:
                options = load(f)
                for key, value in options.items():
                    # User must manually enable recording
                    # otherwise it might lead to corrupt files
                    # when recording starts as soon as the app starts
                    if key == 'recording247':
                        continue
                    # If resolution is empty then default should be used
                    if key == 'resolution' and not value:
                        value = self._default_res
                    setattr(self, key, value)
        except:
            # Maybe file doesn't exist or JSON content is corrupt
            self.save_options()

    def update_option(self, key: str, value, save=True):
        try:
            # Check if the attribute exists
            if key not in self.get_options():
                return False, f"Option '{key}' does not exist"
            
            # Empty values are treated as None, except for boolean values
            setattr(self, key, None if not value and not isinstance(value, bool) else value)
            # Save options to file for next run
            save and self.save_options()
        except Exception as e:
            return str(e)

    def get_options(self):
        return {
            # Classes are not JSON serializable
            k: True if type(v) == type else v
            for k, v in self.__dict__.items()
            # Excluding underscore-prefixed attributes
            if not k.startswith("_")
        }

    def save_options(self):
        with open(options_file, "w") as f:
            dump(self.get_options(), f, indent=4)


options = Options()
