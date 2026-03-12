#!/usr/bin/env bash

set -euo pipefail

bash "$(cd "$(dirname "$0")" && pwd)/server-stop.sh"
bash "$(cd "$(dirname "$0")" && pwd)/server-start.sh"
