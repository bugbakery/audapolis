import enum
import shutil
import tempfile
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Union
from urllib.parse import urlparse
from zipfile import ZipFile

import requests
import yaml
from punctuator import Punctuator
from vosk import Model

from .config import CACHE_DIR, DATA_DIR
from .tasks import Task, tasks


class LanguageDoesNotExist(Exception):
    pass


class ModelDoesNotExist(Exception):
    pass


class ModelNotDownloaded(Exception):
    pass


class ModelTypeNotSupported(Exception):
    pass


@dataclass
class ModelDescription:
    name: str
    url: str
    description: str
    size: str
    type: str
    lang: str
    compressed: bool = field(default=False)
    model_id: str = field(default=None)

    def __post_init__(self):
        self.model_id = f"{self.type}-{self.lang}-{self.name}"

    def path(self) -> Path:
        url = urlparse(self.url)
        return DATA_DIR / (Path(url.path).name + ".model")

    def is_downloaded(self) -> bool:
        return self.path().exists()


@dataclass
class Language:
    lang: str
    transcription_models: List[ModelDescription] = field(default_factory=list)
    punctuation_models: List[ModelDescription] = field(default_factory=list)

    def all_models(self):
        return self.transcription_models + self.punctuation_models


class ModelDefaultDict(defaultdict):
    def __missing__(self, key):
        self[key] = Language(lang=key)
        return self[key]


class Models:
    def __init__(self):
        with open(Path(__file__).parent / "models.yml", "r") as f:
            models_raw = yaml.safe_load(f)
            languages = ModelDefaultDict()
            models = {}
            for lang, lang_models in list(models_raw.items()):
                for model in lang_models:
                    model_description = ModelDescription(lang=lang, **model)
                    models[model_description.model_id] = model_description
                    if model["type"] == "transcription":
                        languages[lang].transcription_models.append(model_description)
                    elif model["type"] == "punctuation":
                        languages[lang].punctuation_models.append(model_description)
        self.available = dict(languages)
        self.model_descriptions = models

        # TODO: does it make sense to cache the models in memory
        #  if we have more than one? also maybe add some time based
        #  heuristics if it is smart to still keep the model in ram
        self.loaded = {}

    @property
    def downloaded(self) -> Dict[str, ModelDescription]:
        filtered = {}
        for lang_name, lang in list(self.available.items()):
            for model in lang.all_models():
                if model.is_downloaded():
                    filtered[model.model_id] = model
        return filtered

    def get_model_description(self, model_id) -> ModelDescription:
        if model_id not in self.model_descriptions:
            raise ModelDoesNotExist

        return self.model_descriptions[model_id]

    def _load_model(self, model):
        if model.type == "transcription":
            return Model(str(model.path()))
        elif model.type == "punctuation":
            return Punctuator(str(model.path()))
        else:
            raise ModelTypeNotSupported()

    def get(self, model_id: str) -> Union[Model, Punctuator]:
        model = self.get_model_description(model_id)
        if not model.is_downloaded():
            raise ModelNotDownloaded()

        if model_id not in self.loaded:
            self.loaded[model_id] = self._load_model(model)
        return self.loaded[model_id]

    def download(self, model_id: str, task_uuid: str):
        task: DownloadModelTask = tasks.get(task_uuid)
        model = self.get_model_description(model_id)
        with tempfile.TemporaryFile(dir=CACHE_DIR) as f:
            response = requests.get(model.url, stream=True)
            task.total = int(response.headers.get("content-length"))
            task.state = DownloadModelState.DOWNLOADING

            for data in response.iter_content(
                chunk_size=max(int(task.total / 1000), 1024 * 1024)
            ):
                task.add_progress(len(data))

                f.write(data)
                if task.canceled:
                    return

            task.state = DownloadModelState.EXTRACTING
            if model.compressed:
                with ZipFile(f) as archive:
                    target_dir = model.path()
                    for info in archive.infolist():
                        if info.is_dir():
                            continue
                        path = target_dir / Path("/".join(info.filename.split("/")[1:]))
                        path.parent.mkdir(exist_ok=True, parents=True)

                        source = archive.open(info.filename)
                        target = open(path, "wb")
                        with source, target:
                            shutil.copyfileobj(source, target)
            else:
                f.seek(0)
                with open(model.path(), "wb") as target:
                    shutil.copyfileobj(f, target)

        task.state = DownloadModelState.DONE

    def delete(self, model_id: str):
        model = self.get_model_description(model_id)
        if model.is_downloaded():
            path = model.path()
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
        else:
            raise ModelNotDownloaded()


models = Models()


class DownloadModelState(str, enum.Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    EXTRACTING = "extracting"
    DONE = "done"
    CANCELED = "canceled"


@dataclass
class DownloadModelTask(Task):
    model_id: str
    state: DownloadModelState = DownloadModelState.QUEUED
    total: float = 0
    processed: float = 0
    progress: float = 0

    def __post_init__(self):
        self.canceled = False

    def add_progress(self, added):
        self.processed += added
        self.progress = self.processed / self.total

    def cancel(self):
        self.canceled = True
