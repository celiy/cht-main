#!/usr/bin/env bash
# build.sh - Thin wrapper that delegates to scripts/build.mjs.
#
# Usage:
#   ./build.sh <client>
#   npm run build -- <client>

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node not found. Install Node.js (v20+) and try again." >&2
    exit 1
fi

exec node "$ROOT_DIR/scripts/build.mjs" "$@"
