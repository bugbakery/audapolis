#!/usr/bin/env sh
set -eu

cd "$(dirname $(realpath $0))"

GIT_ROOT="$(git rev-parse --show-toplevel)"
if [ -z $GIT_ROOT ]; then
  echo "Error, not running in git repo"
  exit 1
fi

cd $GIT_ROOT
rm -rf app/server
mkdir -p app/server
cd server
poetry install
poetry export -f requirements.txt > requirements.txt
poetry run pyoxidizer build --release
cp -r build/*/release/install/* ../app/server/
