#!/usr/bin/env bash
# install.sh - Thin wrapper that delegates to scripts/install.mjs.
#
# The actual install logic (clone repos from clients.json, npm install
# in every sibling repo) lives in scripts/install.mjs. This wrapper
# only ensures Node is available and forwards arguments.
#
# Usage:
#   ./install.sh                   # clone shared repos only
#   ./install.sh --client:<name>   # also clone client repos

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node not found. Install Node.js (v20+) and try again." >&2
    exit 1
fi

exec node "$ROOT_DIR/scripts/install.mjs" "$@"
