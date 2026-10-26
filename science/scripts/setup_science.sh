#!/usr/bin/env bash
set -euo pipefail
h89_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
python3 -c 'import sys; assert sys.version_info[:2] == (3,12), "Science lock targets Python 3.12 on Linux x86_64"'
python3 -m venv "$h89_repo_root/science/.venv"
"$h89_repo_root/science/.venv/bin/python" -m pip install --disable-pip-version-check --only-binary=:all: --require-hashes -r "$h89_repo_root/science/requirements.lock"
python3 "$h89_repo_root/science/scripts/fetch_kernels.py"
python3 "$h89_repo_root/science/scripts/verify_kernels.py"
