#!/usr/bin/env bash
# Build and publish ExceptionOS to PyPI.
#
# Prerequisites (one-time):
#   1. Create an account at https://pypi.org and verify your email.
#   2. Create an API token: PyPI -> Account settings -> API tokens -> Add token
#      (scope it to the whole account for the first upload, then to the project).
#   3. Export it (do NOT commit it):  export TWINE_PASSWORD="pypi-XXXX..."
#      (username is the literal value __token__)
#
# Usage:
#   ./publish.sh            # build, then upload to PyPI
#   ./publish.sh --test     # upload to TestPyPI instead (recommended first run)
set -euo pipefail
cd "$(dirname "$0")"

python3 -m pip install --quiet --upgrade build twine

rm -rf dist
python3 -m build            # creates dist/*.whl and dist/*.tar.gz
python3 -m twine check dist/*

export TWINE_USERNAME="__token__"
if [[ "${1:-}" == "--test" ]]; then
  python3 -m twine upload --repository testpypi dist/*
  echo "Uploaded to TestPyPI: https://test.pypi.org/project/exceptionos/"
else
  python3 -m twine upload dist/*
  echo "Uploaded to PyPI: https://pypi.org/project/exceptionos/"
fi
