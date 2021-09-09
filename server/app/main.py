import enum
import json
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from pydub import AudioSegment
from vosk import KaldiRecognizer, Model

app = FastAPI()

MODEL_PATH = Path("../data/vosk-model-small-de-0.15/")
LANG = "de"
MODEL = Model(str(MODEL_PATH))


SAMPLE_RATE = 16000
# Number of seconds that should be fed into vosk.
# Smaller = better progress estimates, but also slightly higher python overhead
VOSK_BLOCK_SIZE = 2

# This holds the tasks state. TODO(@pajowu), check if we should store this on disk
TASKS = {}


class TranscriptionState(str, enum.Enum):
    QUEUED = "queued"
    LOADING = "loading"
    TRANSCRIBING = "transcribing"
    POST_PROCESSING = "post_processing"
    DONE = "done"


def transform_vosk_result(name: str, result: dict) -> dict:
    content = []
    current_time = 0
    for word in result["result"]:
        if word["start"] > current_time:
            content.append(
                {"start": current_time, "end": word["start"], "type": "silence"}
            )

        content.append(
            {
                "start": word["start"],
                "end": word["end"],
                "type": "word",
                "word": word["word"],
                "conf": word["conf"],
            }
        )
        current_time = word["end"]

    return {"speaker": name, "content": content}


def process_audio(file: UploadFile, task_uuid: str):
    task = TASKS[task_uuid]
    task["state"] = TranscriptionState.LOADING

    audio = AudioSegment.from_file(file)
    audio = audio.set_frame_rate(SAMPLE_RATE)
    audio = audio.set_channels(1)

    task["state"] = TranscriptionState.TRANSCRIBING
    task["total"] = audio.duration_seconds
    task["processed"] = 0

    rec = KaldiRecognizer(MODEL, SAMPLE_RATE)
    rec.SetWords(True)

    finished = False
    while not finished:
        block_start = task["processed"]
        block_end = task["processed"] + VOSK_BLOCK_SIZE
        data = audio[block_start * 1000 : block_end * 1000]
        if block_end > task["total"]:
            block_end = task["total"]
            finished = True
        rec.AcceptWaveform(data.get_array_of_samples().tobytes())
        task["processed"] = block_end
    task["state"] = TranscriptionState.POST_PROCESSING
    vosk_result = json.loads(rec.FinalResult())
    content = transform_vosk_result(task["filename"], vosk_result)
    task["content"] = [content]
    task["state"] = TranscriptionState.DONE


@app.post("/tasks/start_transcription/")
async def start_transcription(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    task_uuid = str(uuid.uuid4())
    background_tasks.add_task(process_audio, file.file, task_uuid)
    TASKS[task_uuid] = {
        "filename": file.filename,
        "uuid": task_uuid,
        "state": TranscriptionState.QUEUED,
    }
    return TASKS[task_uuid]


@app.get("/tasks/list/")
async def list_tasks():
    return sorted(TASKS.values(), key=lambda x: x["uuid"])


@app.get("/tasks/{task_uuid}/")
async def get_task(task_uuid: str):
    return TASKS[task_uuid]
