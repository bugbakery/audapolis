# TODO for punctuation
# - collect models
# x safe model loading
# x ui in frontend
#   x model manager
#   x transcribe page
#   x select default models

import enum
import json
import traceback
import warnings
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Optional

import numpy as np
from fastapi import UploadFile
from pydiar.models import BinaryKeyDiarizationModel, Segment
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
    LOADING_TRANSCRIPTION_MODEL = "loading transcription model"
    LOADING = "loading"
    DIARIZING = "diarizing"
    TRANSCRIBING = "transcribing"
    LOADING_PUNCTUATION_MODEL = "loading punctuation model"
    PUNCTUATING = "punctuating"
    DONE = "done"


@dataclass
class TranscriptionTask(Task):
    filename: str
    state: TranscriptionState
    punctuate: bool
    total: float = 0
    processed: float = 0
    content: Optional[dict] = None
    progress: float = 0

    def set_transcription_progress(self, processed):
        self.processed += processed
        if not self.punctuate:
            self.progress = self.processed / self.total
        else:
            self.progress = (self.processed / self.total) * 0.9

    def set_punctuation_progress(self, processed):
        self.processed = processed
        self.progress = 0.9 + (processed / self.total)


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
        process_callback(processed - block_start)

    vosk_result = json.loads(rec.FinalResult())
    return transform_vosk_result(name, vosk_result, duration, offset)


EPSILON = 0.00001


def process_audio(
    transcription_model: str,
    punctuation_model: Optional[str],
    file: UploadFile,
    fileName: str,
    task_uuid: str,
    diarize: bool,
    diarize_max_speakers: Optional[int],
):
    task = tasks.get(task_uuid)

    content = transcribe(
        task,
        transcription_model,
        file,
        fileName,
        task_uuid,
        diarize,
        diarize_max_speakers,
    )

    if punctuation_model is not None:
        content = punctuate(task, punctuation_model, content)

    task.content = content
    task.state = TranscriptionState.DONE


def punctuate(task, punctuation_model, content):
    task.state = TranscriptionState.LOADING_PUNCTUATION_MODEL
    model = models.get(punctuation_model)
    task.state = TranscriptionState.PUNCTUATING
    for para_idx, para in enumerate(content):
        words = [x for x in para["content"] if x["type"] == "word"]
        full_text = " ".join(x["word"] for x in words)
        punctuated = model.punctuate(
            full_text, titleize=False, heuristic_corrections=False
        )

        for word, puncted in zip(words, punctuated.split(" ")):
            word["word"] = puncted
        task.set_punctuation_progress(para_idx / len(content))

    return content


def transcribe(
    task: TranscriptionTask,
    transcription_model: str,
    file: UploadFile,
    fileName: str,
    task_uuid: str,
    diarize: bool,
    diarize_max_speakers: Optional[int],
):
    task.state = TranscriptionState.LOADING_TRANSCRIPTION_MODEL

    # TODO: Set error state if model does not exist
    model = models.get(transcription_model)

    with warnings.catch_warnings():
        # we ignore the warning that ffmpeg is not found as we
        # don't need ffmpeg to decode wav files
        warnings.filterwarnings("ignore", ".*ffmpeg.*")
        audio = AudioSegment.from_wav(file)
    audio = audio.set_frame_rate(SAMPLE_RATE)
    audio = audio.set_channels(1)

    # TODO: can we make this atomic?
    task.total = audio.duration_seconds
    task.processed = 0

    if not diarize:
        task.state = TranscriptionState.TRANSCRIBING
        return [
            transcribe_raw_data(
                model,
                fileName,
                audio,
                0,
                audio.duration_seconds,
                task.set_transcription_progress,
            )
        ]

    else:
        task.state = TranscriptionState.DIARIZING
        try:
            diarization_model = BinaryKeyDiarizationModel()
            if diarize_max_speakers is not None:
                diarization_model.CLUSTERING_SELECTION_MAX_SPEAKERS = (
                    diarize_max_speakers
                )
            segments = diarization_model.diarize(
                SAMPLE_RATE, np.array(audio.get_array_of_samples())
            )
            optimized_segments = optimize_segments(segments)
        except:  # noqa: E722
            traceback.print_exc()
            optimized_segments = []
        if optimized_segments:
            optimized_segments[-1].length = (
                audio.duration_seconds - optimized_segments[-1].start
            )
        else:
            optimized_segments = [
                Segment(start=0, length=audio.duration_seconds, speaker_id=1)
            ]
        with ThreadPoolExecutor() as executor:
            task.state = TranscriptionState.TRANSCRIBING
            return list(
                executor.map(
                    lambda segment: transcribe_raw_data(
                        model,
                        f"Speaker {int(segment.speaker_id)} ({fileName})",
                        audio,
                        segment.start,
                        segment.length,
                        task.set_transcription_progress,
                    ),
                    optimized_segments,
                )
            )


def transform_vosk_result(
    name: str, result: dict, length: float, offset: float = 0
) -> dict:
    content = []
    current_time = 0

    for word in result.get("result", []):
        word_start = word["start"]

        if word["start"] > current_time:
            if (word["start"] - current_time) > 10 * EPSILON:
                content.append(
                    {
                        "sourceStart": current_time + offset,
                        "length": word["start"] - current_time,
                        "type": "silence",
                    }
                )
            else:
                word_start = current_time

        content.append(
            {
                "sourceStart": word_start + offset,
                "length": word["end"] - word["start"],
                "type": "word",
                "word": word["word"],
                "conf": word["conf"],
            }
        )
        current_time = word["end"]
    if current_time < length:
        if (length - current_time) < 10 * EPSILON and content:
            content[-1]["length"] += length - current_time
        else:
            content.append(
                {
                    "sourceStart": current_time + offset,
                    "length": length - current_time,
                    "type": "silence",
                }
            )

    return {"speaker": name, "content": content}
