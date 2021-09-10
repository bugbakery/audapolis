#!/bin/bash
set -ue
function download_model {
    url="$1"
    path="$2"
    if ! [ -e "${path}" ]; then
        wget "${url}" -O tmp.zip
        mkdir ${path}
        unzip tmp.zip
    fi
}

download_model https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip vosk-model-small-de-0.15
download_model http://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip vosk-model-small-en-us-0.15
