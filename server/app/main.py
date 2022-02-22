import base64
import json
import os
from typing import List, Optional

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from starlette.status import HTTP_401_UNAUTHORIZED

from .models import (
    DownloadModelTask,
    LanguageDoesNotExist,
    ModelDoesNotExist,
    ModelNotDownloaded,
    ModelTypeNotSupported,
    models,
)
from .otio import Segment, convert_otio
from .tasks import TaskNotFoundError, tasks
from .transcribe import TranscriptionState, TranscriptionTask, process_audio

app = FastAPI()
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUTH_TOKEN = base64.b64encode(os.urandom(64)).decode()


def token_auth(request: Request):
    authorization: str = request.headers.get("Authorization")
    if authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Not authorized")
    return authorization


@app.on_event("startup")
def startup_event():
    print(json.dumps({"msg": "server_started", "token": AUTH_TOKEN}), flush=True)


@app.post("/tasks/start_transcription/")
async def start_transcription(
    background_tasks: BackgroundTasks,
    transcription_model: str,
    punctuation_model: Optional[str] = None,
    diarize_max_speakers: Optional[int] = None,
    diarize: bool = False,
    file: UploadFile = File(...),
    fileName: str = Form(...),
    auth: str = Depends(token_auth),
):
    task = tasks.add(
        TranscriptionTask(
            file.filename,
            TranscriptionState.QUEUED,
            punctuate=punctuation_model is not None,
        )
    )
    background_tasks.add_task(
        process_audio,
        transcription_model,
        punctuation_model,
        file.file,
        fileName,
        task.uuid,
        diarize,
        diarize_max_speakers,
    )
    return task


@app.post("/tasks/download_model/")
async def download_model(
    background_tasks: BackgroundTasks,
    model_id: str,
    auth: str = Depends(token_auth),
):
    task = tasks.add(DownloadModelTask(model_id))
    background_tasks.add_task(models.download, model_id, task.uuid)
    return task


# FIXME: this needs to be removed / put behind proper auth for security reasons
@app.get("/tasks/list/")
async def list_tasks(auth: str = Depends(token_auth)):
    return sorted(tasks.list(), key=lambda x: x.uuid)


@app.get("/tasks/{task_uuid}/")
async def get_task(task_uuid: str, auth: str = Depends(token_auth)):
    return tasks.get(task_uuid)


@app.delete("/tasks/{task_uuid}/")
async def remove_task(task_uuid: str, auth: str = Depends(token_auth)):
    return tasks.delete(task_uuid)


@app.get("/models/available")
async def get_all_models(auth: str = Depends(token_auth)):
    return models.available


@app.post("/models/delete")
async def delete_model(model_id: str, auth: str = Depends(token_auth)):
    models.delete(model_id)
    return PlainTextResponse("", status_code=200)


@app.get("/models/downloaded")
async def get_downloaded_models(auth: str = Depends(token_auth)):
    return models.downloaded


@app.post("/util/otio/convert")
async def convert_otio_http(
    name: str,
    adapter: str,
    timeline: List[Segment],
    auth: str = Depends(token_auth),
):
    converted = convert_otio(timeline, name, adapter)
    return PlainTextResponse(converted)


@app.exception_handler(TaskNotFoundError)
async def task_not_found_error_handler(request, exc):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(LanguageDoesNotExist)
async def language_does_not_exist_handler(request, exc):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(ModelDoesNotExist)
async def model_does_not_exist_handler(request, exc):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(ModelNotDownloaded)
async def model_not_downloaded_handler(request, exc):
    return PlainTextResponse(str(exc), status_code=412)


@app.exception_handler(ModelTypeNotSupported)
async def model_type_not_supported(request, exc):
    return PlainTextResponse(str(exc), status_code=412)
