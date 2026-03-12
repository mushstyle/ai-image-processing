#!/usr/bin/env bash

set -euo pipefail

# shellcheck disable=SC1091
. "$(cd "$(dirname "$0")" && pwd)/_common.sh"

PID_FILE="$(pid_file)"

if [[ ! -f "$PID_FILE" ]]; then
  echo "nano-banana is not running"
  exit 0
fi

APP_PID="$(cat "$PID_FILE")"
if kill -0 "$APP_PID" 2>/dev/null; then
  kill "$APP_PID"
  sleep 1
fi

rm -f "$PID_FILE"
echo "nano-banana stopped"
