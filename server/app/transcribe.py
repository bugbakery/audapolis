import enum
import json
from dataclasses import dataclass
from typing import Optional

import numpy as np
from fastapi import UploadFile
from pydiar.models import BinaryKeyDiarizationModel
from pydiar.util.misc import optimize_segments
from pydub import AudioSegment
from vosk import KaldiRecognizer, Model

from .models import models
from .tasks import Task, tasks

SAMPLE_RATE = 16000
# Number of seconds that should be fed into vosk.
# Smaller = better progress estimates, but also slightly higher python overhead
VOSK_BLOCK_SIZE = 2


class TranscriptionState(str, enum.Enum):
    QUEUED = "queued"
    LOADING = "loading"
    DIARIZING = "diarizing"
    TRANSCRIBING = "transcribing"
    POST_PROCESSING = "post_processing"
    DONE = "done"


@dataclass
class TranscriptionTask(Task):
    filename: str
    state: TranscriptionState
    total: float = 0
    processed: float = 0
    content: Optional[dict] = None

    def set_progress(self, processed, state):
        self.processed = processed
        self.state = state


def transcribe_raw_data(model: Model, name, audio, offset, duration, process_callback):
    rec = KaldiRecognizer(model, SAMPLE_RATE)
    rec.SetWords(True)

    finished = False
    processed = offset
    while not finished:
        block_start = processed
        block_end = processed + VOSK_BLOCK_SIZE
        if block_end > offset + duration:
            block_end = offset + duration
            finished = True
        data = audio[block_start * 1000 : block_end * 1000]
        rec.AcceptWaveform(data.get_array_of_samples().tobytes())
        processed = block_end
        process_callback(processed, TranscriptionState.TRANSCRIBING)
    process_callback(processed, TranscriptionState.POST_PROCESSING)
    vosk_result = json.loads(rec.FinalResult())
    return transform_vosk_result(name, vosk_result, duration, offset)


def process_audio(
    lang: str,
    model: str,
    file: UploadFile,
    fileName: str,
    task_uuid: str,
    diarize: bool,
):
    # TODO: Set error state if model does not exist
    model = models.get(lang, model)

    task = tasks.get(task_uuid)
    task.state = TranscriptionState.LOADING

    audio = AudioSegment.from_wav(file)
    audio = audio.set_frame_rate(SAMPLE_RATE)
    audio = audio.set_channels(1)

    # TODO: can we make this atomic?
    task.total = audio.duration_seconds
    task.processed = 0

    if not diarize:
        task.state = TranscriptionState.TRANSCRIBING
        content = transcribe_raw_data(
            model, fileName, audio, 0, audio.duration_seconds, task.set_progress
        )
        task.content = [content]
        task.state = TranscriptionState.DONE

    else:
        task.state = TranscriptionState.DIARIZING
        diarization_model = BinaryKeyDiarizationModel()
        segments = diarization_model.diarize(
            SAMPLE_RATE, np.array(audio.get_array_of_samples())
        )
        optimized_segments = optimize_segments(segments)
        task.content = [
            transcribe_raw_data(
                model,
                f"Speaker {int(segment.speaker_id)} ({fileName})",
                audio,
                segment.start,
                segment.length,
                task.set_progress,
            )
            for segment in optimized_segments
        ]
        task.state = TranscriptionState.DONE


def transform_vosk_result(
    name: str, result: dict, length: float, offset: float = 0
) -> dict:
    content = []
    current_time = 0
    for word in result.get("result", []):
        if word["start"] > current_time:
            content.append(
                {
                    "sourceStart": current_time + offset,
                    "length": word["start"] - current_time,
                    "type": "silence",
                }
            )

        content.append(
            {
                "sourceStart": word["start"] + offset,
                "length": word["end"] - word["start"],
                "type": "word",
                "word": word["word"],
                "conf": word["conf"],
            }
        )
        current_time = word["end"]
    if current_time < length:
        content.append(
            {
                "sourceStart": current_time + offset,
                "length": length - current_time,
                "type": "silence",
            }
        )

    return {"speaker": name, "content": content}
