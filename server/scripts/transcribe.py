import argparse
import hashlib
import json
import time
import uuid
import zipfile
from pathlib import Path

import requests
import tqdm


def sha256sum(filename, blocksize=65536):
    hash = hashlib.sha256()
    with open(filename, "rb") as f:
        for block in iter(lambda: f.read(blocksize), b""):
            hash.update(block)
    return hash.hexdigest()


def paragraphItemV1V2toV3(item):
    if item["type"] == "word":
        return {
            "type": "text",
            "uuid": str(uuid.uuid4()),
            "length": item["length"],
            "source": item["source"],
            "sourceStart": item["sourceStart"],
            "conf": item["conf"],
            "text": item["word"],
        }
    elif item["type"] == "silence":
        return {
            "type": "non_text",
            "uuid": str(uuid.uuid4()),
            "length": item["length"],
            "source": item["source"],
            "sourceStart": item["sourceStart"],
        }
    elif item["type"] == "artificial_silence":
        return {
            "type": "artificial_silence",
            "uuid": str(uuid.uuid4()),
            "length": item["length"],
        }
    else:
        raise Exception("Unknown item type")


def convertTranscriptionResultToV3Content(content, source, language):
    v3_content = []
    for para in content:
        v3_content.append(
            {
                "type": "paragraph_start",
                "uuid": str(uuid.uuid4()),
                "speaker": para["speaker"],
                "language": language,
            }
        )

        for item in para["content"]:

            item["source"] = source
            v3_content.append(paragraphItemV1V2toV3(item))

        v3_content.append({"type": "paragraph_end", "uuid": str(uuid.uuid4())})

    return v3_content


def save_result(file, output_file, source_hash, content, language, diarize):
    document = {
        "sources": [{"fileName": file.name}],
        "content": convertTranscriptionResultToV3Content(
            content, source_hash, language
        ),
        "metadata": {"display_speaker_names": diarize, "display_video": False},
        "version": 3,
    }

    print(f"Writing file to {output_file}")

    with zipfile.ZipFile(output_file, "w") as audapolis_zip:
        audapolis_zip.write(file, arcname=f"sources/{source_hash}")
        audapolis_zip.writestr("document.json", json.dumps(document, indent=4))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--language")
    parser.add_argument("--transcription-model")
    parser.add_argument("--punctuation-model", required=False)
    parser.add_argument("--server", default="http://127.0.0.1:8000")
    parser.add_argument("--token")
    parser.add_argument("--diarize", action="store_true")
    args = parser.parse_args()

    headers = {}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    print(f"Uploading {args.file}")
    upload_req = requests.post(
        f"{args.server}/tasks/start_transcription/",
        files={"file": open(args.file, "rb")},
        params={
            "transcription_model": f"transcription-{args.language}-{args.transcription_model}",
            "punctuation_model": f"punctuation-{args.language}-{args.punctuation_model}",
            "diarize": args.diarize,
        },
        data={"fileName": str(args.file)},
        headers=headers,
    )

    pbar = tqdm.tqdm(total=100)

    while True:
        status_req = requests.get(
            f"{args.server}/tasks/{upload_req.json()['uuid']}/", headers=headers
        )
        if status_req.json()["state"] == "done":
            break

        time.sleep(0.1)

        pbar.update((status_req.json()["progress"] * 100) - pbar.n)
        pbar.set_description(status_req.json()["state"])

    pbar.update(100 - pbar.n)
    pbar.close()

    content = status_req.json()["content"]
    source_hash = sha256sum(args.file)

    output_file = args.file.with_suffix(".audapolis")
    save_result(
        args.file, output_file, source_hash, content, args.language, args.diarize
    )
