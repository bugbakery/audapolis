#!/usr/bin/env sh
set -eu

rm -r app/server &> /dev/null || true
mkdir -p app/server
cd server
poetry install
poetry export -f requirements.txt > requirements.txt
poetry run pyoxidizer build --release
cp -r build/*/release/install/* ../app/server/
