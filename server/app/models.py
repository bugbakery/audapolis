import enum
import shutil
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile

import requests
import yaml
from vosk import Model

from .config import DATA_DIR
from .tasks import tasks


class LanguageDoesNotExist(Exception):
    pass


class ModelDoesNotExist(Exception):
    pass


class ModelNotDownloaded(Exception):
    pass


@dataclass
class ModelDescription:
    lang: str
    name: str
    url: str
    description: str
    size: str
    wer_speed: str

    def path(self):
        idx = self.url.rfind("/")
        return DATA_DIR / (self.url[idx + 1 :] + ".model")

    def is_downloaded(self):
        return self.path().exists()


class Models:
    def __init__(self):
        with open(Path(__file__).parent / "models.yml", "r") as f:
            models_raw = yaml.safe_load(f)
            models = defaultdict(list)
            for lang, lang_models in list(models_raw.items()):
                for model in lang_models:
                    models[lang].append(ModelDescription(lang=lang, **model))
        self.available = dict(models)

        # TODO: does it make sense to cache the models in memory
        #  if we have more than one? also maybe add some time based
        #  heuristics if it is smart to still keep the model in ram
        self.loaded = {}

    @property
    def downloaded(self):
        filtered = defaultdict(list)
        for lang, models in list(self.available.items()):
            for model in models:
                if model.is_downloaded():
                    filtered[lang].append(model)
        return dict(filtered)

    def model_description_from_lang_and_name(
        self, lang: str, name: str
    ) -> ModelDescription:
        if lang not in self.available:
            raise LanguageDoesNotExist
        to_return = next((x for x in self.available[lang] if x.name == name), None)
        if to_return is None:
            raise ModelDoesNotExist
        return to_return

    def get(self, lang: str, name: str):
        print(lang, name)
        model = self.model_description_from_lang_and_name(lang, name)
        if not model.is_downloaded():
            raise ModelNotDownloaded()

        path = model.path()
        if path not in self.loaded:
            self.loaded[path] = Model(str(path))
        return self.loaded[path]

    def download(self, lang: str, name: str, task_uuid: str):
        task: DownloadModelTask = tasks.get(task_uuid)
        model = self.model_description_from_lang_and_name(lang, name)
        with tempfile.TemporaryFile() as f:
            response = requests.get(model.url, stream=True)
            task.total = int(response.headers.get("content-length"))
            task.state = DownloadModelState.DOWNLOADING
            if task.total is None:
                f.write(response.content)
            else:
                for data in response.iter_content(
                    chunk_size=max(int(task.total / 1000), 1024 * 1024)
                ):
                    task.processed += len(data)
                    f.write(data)

            task.state = DownloadModelState.EXTRACTING
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

        task.state = DownloadModelState.DONE


models = Models()


class DownloadModelState(str, enum.Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    EXTRACTING = "extracting"
    DONE = "done"


@dataclass
class DownloadModelTask:
    lang: str
    name: str
    state: DownloadModelState = DownloadModelState.QUEUED
    total: float = 0
    processed: float = 0
