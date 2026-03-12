#!/usr/bin/env bash

set -euo pipefail

# shellcheck disable=SC1091
. "$(cd "$(dirname "$0")" && pwd)/_common.sh"

PID_FILE="$(pid_file)"
PORT="${PORT:-$(app_port)}"

find_pid_by_port() {
  ss -ltnp "sport = :$PORT" 2>/dev/null | awk -F'pid=' 'NR > 1 { split($2, parts, ","); print parts[1]; exit }'
}

if [[ ! -f "$PID_FILE" ]]; then
  FALLBACK_PID="$(find_pid_by_port)"
  if [[ -n "$FALLBACK_PID" ]]; then
    kill "$FALLBACK_PID"
    sleep 1
    echo "nano-banana stopped"
    exit 0
  fi

  echo "nano-banana is not running"
  exit 0
fi

APP_PID="$(cat "$PID_FILE")"
if kill -0 "$APP_PID" 2>/dev/null; then
  kill "$APP_PID"
  sleep 1
elif FALLBACK_PID="$(find_pid_by_port)"; [[ -n "$FALLBACK_PID" ]]; then
  kill "$FALLBACK_PID"
  sleep 1
fi

rm -f "$PID_FILE"
echo "nano-banana stopped"
