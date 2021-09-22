from fastapi import BackgroundTasks, FastAPI, File, UploadFile, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from .models import (
    DownloadModelTask,
    LanguageDoesNotExist,
    ModelDoesNotExist,
    ModelNotDownloaded,
    models,
)
from .tasks import TaskNotFoundError, tasks
from .transcribe import TranscriptionState, TranscriptionTask, process_audio
import base64
import os
import json

app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://localhost",
]

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


def get_data_dir():
    if "AUDAPOLIS_DATA_DIR" in os.environ:
        return Path(os.environ.get("AUDAPOLIS_DATA_DIR"))
    return Path(__file__).absolute().parent.parent.parent / "data"


@app.post("/tasks/start_transcription/")
async def start_transcription(
    background_tasks: BackgroundTasks,
    lang: str,
    model: str,
    file: UploadFile = File(...),
    auth: str = Depends(token_auth),
):
    task = tasks.add(TranscriptionTask(file.filename, TranscriptionState.QUEUED))
    background_tasks.add_task(process_audio, lang, model, file.file, task.uuid)
    return task


@app.post("/tasks/download_model/")
async def download_model(
    background_tasks: BackgroundTasks,
    lang: str,
    model: str,
    auth: str = Depends(token_auth)
):
    task = tasks.add(DownloadModelTask(lang, model))
    background_tasks.add_task(models.download, lang, model, task.uuid)
    return task


# FIXME: this needs to be removed / put behind proper auth for security reasons
@app.get("/tasks/list/")
async def list_tasks(auth: str = Depends(token_auth)):
    return sorted(tasks.list(), key=lambda x: x.uuid)


@app.get("/tasks/{task_uuid}/")
async def get_task(task_uuid: str,auth: str = Depends(token_auth)):
    return tasks.get(task_uuid)


@app.get("/models/available")
async def get_all_models(auth: str = Depends(token_auth)):
    return models.available


@app.post("/models/delete")
async def delete_model(
    lang: str,
    model: str,
    auth: str = Depends(token_auth)
):
    models.delete(lang, model)
    return PlainTextResponse("", status_code=200)


@app.get("/models/downloaded")
async def get_downloaded_models(auth: str = Depends(token_auth)):
    return models.downloaded


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