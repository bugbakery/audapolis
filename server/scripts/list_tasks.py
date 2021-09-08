import argparse
import time

import requests
from rich.live import Live
from rich.table import Table

parser = argparse.ArgumentParser()
parser.add_argument("--server", default="http://127.0.0.1:8000")
args = parser.parse_args()


def generate_table() -> Table:
    """Make a new table."""
    tasks = requests.get(f"{args.server}/tasks/list/")
    table = Table(title="Tasks")

    table.add_column("UUID")
    table.add_column("Filename")
    table.add_column("State")

    for task in tasks.json():
        state = task["state"]
        if state == "transcribing":
            state += f" ({task['processed']/task['total']:%}%)"
        table.add_row(task["uuid"], task["filename"], state)
    return table


with Live(generate_table(), refresh_per_second=4) as live:
    while True:
        time.sleep(0.1)
        live.update(generate_table())
