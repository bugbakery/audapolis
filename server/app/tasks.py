# This holds the tasks state. TODO(@pajowu), check if we should store this on disk
import uuid


class Tasks:
    def __init__(self):
        self.tasks = {}

    def add(self, task):
        task_uuid = str(uuid.uuid4())

        class TaskWithUuid(tasks.__class__):
            uuid: str

        to_return = TaskWithUuid.__new__(TaskWithUuid)
        to_return.__dict__.update(task.__dict__)
        to_return.uuid = task_uuid

        self.tasks[task_uuid] = to_return
        return to_return

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
