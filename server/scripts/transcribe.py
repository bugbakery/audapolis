import argparse
from pathlib import Path
from pprint import pprint

import requests

parser = argparse.ArgumentParser()
parser.add_argument("file", type=Path)
parser.add_argument("--server", default="http://127.0.0.1:8000")
args = parser.parse_args()

print(f"Uploading {args.file}")
upload_req = requests.post(
    f"{args.server}/tasks/start_transcription/", files={"file": open(args.file, "rb")}
)

while True:
    status_req = requests.get(f"{args.server}/tasks/{upload_req.json()['uuid']}/")
    if status_req.json()["state"] == "done":
        pprint(status_req.json())
        break

    print(status_req.json(), end="\r")

print()
