import os
from pathlib import Path

import appdirs

DATA_DIR = Path(
    os.environ.get("AUDAPOLIS_DATA_DIR", appdirs.user_data_dir("audapolis"))
)
DATA_DIR.mkdir(exist_ok=True, parents=True)
