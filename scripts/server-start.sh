#!/usr/bin/env bash

set -euo pipefail

# shellcheck disable=SC1091
. "$(cd "$(dirname "$0")" && pwd)/_common.sh"

load_nvm
require_node_version
ensure_prompt_store

PORT="${PORT:-$(app_port)}"
HOST="${HOST:-127.0.0.1}"
PID_FILE="$(pid_file)"
LOG_FILE="$(log_file)"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "nano-banana is already running with pid $EXISTING_PID"
    exit 0
  fi

  rm -f "$PID_FILE"
fi

cd "$ROOT_DIR"
nohup ./node_modules/.bin/next start --hostname "$HOST" --port "$PORT" >>"$LOG_FILE" 2>&1 &
APP_PID=$!
echo "$APP_PID" >"$PID_FILE"

sleep 1
if ! kill -0 "$APP_PID" 2>/dev/null; then
  echo "Failed to start nano-banana. See $LOG_FILE"
  exit 1
fi

echo "nano-banana started on http://$HOST:$PORT with pid $APP_PID"
