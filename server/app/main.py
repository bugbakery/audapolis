import enum
import json
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import yaml
from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from pydub import AudioSegment
from vosk import KaldiRecognizer, Model

app = FastAPI()

DATA_DIR = Path(__file__).absolute().parent.parent.parent / "data"
CONFIG_FILE = DATA_DIR / "config.yml"
# TODO: does it make sense to cache the models in memory if we have more than one?
LOADED_MODELS = {}

SAMPLE_RATE = 16000
# Number of seconds that should be fed into vosk.
# Smaller = better progress estimates, but also slightly higher python overhead
VOSK_BLOCK_SIZE = 2

# This holds the tasks state. TODO(@pajowu), check if we should store this on disk
TASKS = {}

if not DATA_DIR.exists():
    print(f"ERROR: data directory {DATA_DIR.absolute()} does not exist")
    sys.exit(-1)

if not CONFIG_FILE.exists():
    print(f"ERROR: config file {CONFIG_FILE.absolute()} does not exist")
    sys.exit(-1)

with open(CONFIG_FILE, "r") as f:
    CONFIG = yaml.safe_load(f)


def validate_config(config):
    if "languages" not in config:
        print("ERROR: 'languages' not defined in config")
        return False
    if not config["languages"]:
        print("ERROR: No languages defined in config")
        return False
    for language, lang_data in config["languages"].items():
        if "name" not in lang_data:
            print(f"ERROR: no name for language {language} given")
            return False
        if "models" not in lang_data or not lang_data["models"]:
            print(f"ERROR: No models for {language} given")
            return False
        for model_id, model_data in lang_data["models"].items():
            if "path" not in model_data:
                print(f"ERROR: No path giiven for model {model_id}")
                return False
            if "name" not in model_data:
                print(f"ERROR: No name giiven for model {model_id}")
                return False
            model_path = DATA_DIR / model_data["path"]
            if not model_path.exists():
                print(f"ERROR: {model_path} does not exist")
                return False

    return True


if not validate_config(CONFIG):
    sys.exit(-1)


class LanguageDoesNotExist(Exception):
    pass


class ModelDoesNotExist(Exception):
    pass


def get_model(lang, model):
    if lang not in CONFIG["languages"]:
        raise LanguageDoesNotExist
    if model not in CONFIG["languages"][lang]["models"]:
        raise ModelDoesNotExist

    model_path = DATA_DIR / CONFIG["languages"][lang]["models"][model]["path"]
    if str(model_path) in LOADED_MODELS:
        return LOADED_MODELS[str(model_path)]
    else:
        model = Model(str(model_path))
        LOADED_MODELS[str(model_path)] = model
        return model


class TranscriptionState(str, enum.Enum):
    QUEUED = "queued"
    LOADING = "loading"
    TRANSCRIBING = "transcribing"
    POST_PROCESSING = "post_processing"
    DONE = "done"


@dataclass
class Task:
    uuid: str
    filename: str
    state: TranscriptionState
    total: float = 0
    processed: float = 0
    content: Optional[dict] = None


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


def process_audio(lang: str, model: str, file: UploadFile, task_uuid: str):
    model = get_model(lang, model)

    task = TASKS[task_uuid]
    task.state = TranscriptionState.LOADING

    audio = AudioSegment.from_file(file)
    audio = audio.set_frame_rate(SAMPLE_RATE)
    audio = audio.set_channels(1)

    # TODO: can we make this atomic?
    task.total = audio.duration_seconds
    task.processed = 0
    task.state = TranscriptionState.TRANSCRIBING

    rec = KaldiRecognizer(model, SAMPLE_RATE)
    rec.SetWords(True)

    finished = False
    while not finished:
        block_start = task.processed
        block_end = task.processed + VOSK_BLOCK_SIZE
        data = audio[block_start * 1000 : block_end * 1000]
        if block_end > task.total:
            block_end = task.total
            finished = True
        rec.AcceptWaveform(data.get_array_of_samples().tobytes())
        task.processed = block_end
    task.state = TranscriptionState.POST_PROCESSING
    vosk_result = json.loads(rec.FinalResult())
    content = transform_vosk_result(task.filename, vosk_result)
    task.content = [content]
    task.state = TranscriptionState.DONE


@app.post("/tasks/start_transcription/")
async def start_transcription(
    background_tasks: BackgroundTasks,
    lang: str,
    model: str,
    file: UploadFile = File(...),
):
    task_uuid = str(uuid.uuid4())
    background_tasks.add_task(process_audio, lang, model, file.file, task_uuid)
    TASKS[task_uuid] = Task(task_uuid, file.filename, TranscriptionState.QUEUED)
    return TASKS[task_uuid]


# FIXME: this needs to be removed / put behind proper auth for security reasons
@app.get("/tasks/list/")
async def list_tasks():
    return sorted(TASKS.values(), key=lambda x: x["uuid"])


@app.get("/tasks/{task_uuid}/")
async def get_task(task_uuid: str):
    return TASKS[task_uuid]


@app.get("/config/")
async def get_config():
    config = {"languages": {}}
    for lang_id, lang_data in CONFIG["languages"].items():
        config["languages"][lang_id] = {"name": lang_data["name"], "models": {}}
        for mod_id, mod_data in lang_data["models"].items():
            config["languages"][lang_id]["models"][mod_id] = {
                "name": mod_data["name"],
            }
    return config
