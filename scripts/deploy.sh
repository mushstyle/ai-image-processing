#!/usr/bin/env bash

set -euo pipefail

# shellcheck disable=SC1091
. "$(cd "$(dirname "$0")" && pwd)/_common.sh"

SSH_HOST="$(app_ssh_host)"
REMOTE_PATH="$(app_remote_path)"

require_node_version
npm run build

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'webapp' \
  --exclude 'outputs' \
  --exclude 'temp' \
  --exclude '.env.local' \
  --exclude 'data/prompts.json' \
  ./ "${SSH_HOST}:${REMOTE_PATH}/"

if [[ -f "$ROOT_DIR/.env" ]]; then
  rsync -az "$ROOT_DIR/.env" "${SSH_HOST}:${REMOTE_PATH}/.env"
fi

ssh "$SSH_HOST" "bash -lc '
  set -euo pipefail
  cd \"$REMOTE_PATH\"
  . ./scripts/_common.sh
  load_nvm
  require_node_version
  npm install
  npm run build
  bash ./scripts/server-restart.sh
'"

cat <<EOF

Deploy complete.

Ensure the server Caddyfile contains:

$(cat "$ROOT_DIR/deploy/Caddyfile.banana.mush.style")

EOF
