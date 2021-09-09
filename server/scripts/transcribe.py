import argparse
from pathlib import Path
from pprint import pprint
import json
import zipfile
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

output_file = args.file.with_suffix('.audapolis')
content = status_req.json()['content']
for paragraph in content:
    for word in paragraph['content']:
        word['source'] = 0
        
document = {"sources": [{"fileName": args.file.name}], "content":content}
print()
print(document)
with zipfile.ZipFile(output_file, "w") as audapolis_zip:
    audapolis_zip.write(args.file, arcname=args.file.name)
    audapolis_zip.writestr("document.json", json.dumps(document, indent=4))