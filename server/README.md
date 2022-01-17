# Server

This directory contains the server part of audapolis.
The server provides functionality that was either too annoying to implement in javascript or deemed too costly to perform only in the app.

Currently the main functionality it will provide is transcription:
With `vosk`, a great python-library for transcribing audio exists.
However running the speech-to-text on a normal computer takes a lot of time.
This can be speed up a by running the task on a machine with more computing power.
It might also be possible to speed it up by running it on a GPU.

Therefore we decided to create a small server that provides transcription.
This can either be run on the same host as the app or hosted somewhere else.

## Installation & Usage

You need to install the server dependencies even if you dont want hack on the python side of things.

The server-component of audapolis is written in `python3` so you need to have that [installed](https://wiki.python.org/moin/BeginnersGuide/Download).
It depends on `numpy` which does not provide official 32-bit python-3.10 wheels for windows. Try to avoid that combination.


We use [poetry](https://python-poetry.org/) for dependency management.
Either install poetry using your system package manager or by running:


```sh
pip install poetry
```

After that you can install the required dependencies by running

```sh
poetry install
```


Normally the server should be automatically started by the app.
If you want to start the server on its own anyway for a laugh, run the following:
```sh
poetry run uvicorn app.main:app --reload
```

## Code checks & tests

We use black, isort and flake8 for code formatting.
You can either run them manually or use the [pre-commit](https://pre-commit.com)-hook.
To do that install `pre-commit` using you system package manager or by running

```sh
pip install pre-commit
```

After that install the hook by running

```sh
pre-commit install
```

Now the code will be reformatted every time you commit.
