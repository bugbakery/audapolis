#!/usr/bin/env sh
set -eu

cd "$(dirname $(readlink -f $0))"

GIT_ROOT="$(git rev-parse --show-toplevel)"
if [ -z $GIT_ROOT ]; then
  echo "Error, not running in git repo"
  exit 1
fi

cd $GIT_ROOT
rm -rf app/server
mkdir -p app/server
cd server
poetry export -f requirements.txt --without-hashes -o requirements.txt
# tldr; fun fun fun, see https://github.com/pypa/setuptools/issues/3089
# Longer explanation: setuptools >= 60 ships an own version of distutils, which
# isn't properly loaded in our server build, crashing the server. This fixes it
# for now, we might need a different fix in the future
echo 'setuptools<60.0.0' >> requirements.txt
pyoxidizer build --release
cp -r build/*/release/install/* ../app/server/
