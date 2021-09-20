# This holds the tasks state. TODO(@pajowu), check if we should store this on disk
import uuid
from dataclasses import dataclass, field


@dataclass
class Task:
    uuid: str = field(default_factory=lambda: str(uuid.uuid4()), init=False)


class Tasks:
    def __init__(self):
        self.tasks = {}

    def add(self, task: Task):
        self.tasks[task.uuid] = task
        return task

    def get(self, uuid: str):
        try:
            return self.tasks[uuid]
        except KeyError:
            raise TaskNotFoundError()

    def list(self):
        return self.tasks.values()


class TaskNotFoundError(Exception):
    pass


tasks = Tasks()
