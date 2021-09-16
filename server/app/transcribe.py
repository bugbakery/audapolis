import enum
import json
from dataclasses import dataclass
from typing import Optional

from fastapi import UploadFile
from pydub import AudioSegment
from vosk import KaldiRecognizer

from .models import models
from .tasks import tasks

SAMPLE_RATE = 16000
# Number of seconds that should be fed into vosk.
# Smaller = better progress estimates, but also slightly higher python overhead
VOSK_BLOCK_SIZE = 2


class TranscriptionState(str, enum.Enum):
    QUEUED = "queued"
    LOADING = "loading"
    TRANSCRIBING = "transcribing"
    POST_PROCESSING = "post_processing"
    DONE = "done"


@dataclass
class TranscriptionTask:
    filename: str
    state: TranscriptionState
    total: float = 0
    processed: float = 0
    content: Optional[dict] = None


def process_audio(lang: str, model: str, file: UploadFile, task_uuid: str):
    model = models.get(lang, model)

    task = tasks.get(task_uuid)
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
