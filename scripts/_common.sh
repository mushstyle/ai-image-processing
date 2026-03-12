#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_NODE_VERSION="22.10.0"

deploy_value() {
  local key="$1"
  awk -F': ' -v target="$key" '$1 == target { print $2 }' "$ROOT_DIR/deploy.yaml"
}

app_name() {
  deploy_value app_name
}

app_port() {
  deploy_value port
}

app_domain() {
  deploy_value domain
}

app_remote_path() {
  deploy_value remote_path
}

app_ssh_host() {
  deploy_value ssh_host
}

pid_file() {
  printf '%s/.run/%s.pid\n' "$ROOT_DIR" "$(app_name)"
}

log_file() {
  printf '%s/logs/%s.log\n' "$ROOT_DIR" "$(app_name)"
}

ensure_runtime_dirs() {
  mkdir -p "$ROOT_DIR/.run" "$ROOT_DIR/logs" "$ROOT_DIR/data"
}

ensure_prompt_store() {
  ensure_runtime_dirs

  if [[ ! -f "$ROOT_DIR/data/prompts.json" ]]; then
    cat <<'EOF' >"$ROOT_DIR/data/prompts.json"
{
  "prompts": []
}
EOF
  fi
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  fi
}

require_node_version() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not available on PATH after loading NVM" >&2
    exit 1
  fi

  node - "$MIN_NODE_VERSION" <<'EOF'
const minVersion = process.argv[2];
const currentVersion = process.versions.node;

function toParts(version) {
  return version.split('.').map((value) => Number.parseInt(value, 10));
}

function compareVersions(left, right) {
  const leftParts = toParts(left);
  const rightParts = toParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

if (compareVersions(currentVersion, minVersion) < 0) {
  console.error(`Node.js ${currentVersion} is too old. Required: >= ${minVersion}`);
  process.exit(1);
}
EOF
}
