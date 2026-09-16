#!/usr/bin/env bash
# install.sh - Thin wrapper that delegates to scripts/install.mjs.
#
# The actual install logic (git clone/pull repos, npm install in every
# sibling repo) lives in scripts/install.mjs. This wrapper only ensures
# Node is available and forwards arguments.
#
# Usage:
#   ./install.sh                   # sync shared + discovered client repos
#   ./install.sh --client:<name>   # shared + that client's frontend/backend repos

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/ensure-node.sh
. "$ROOT_DIR/scripts/ensure-node.sh"
ensure_node_from_nvmrc "$ROOT_DIR" || exit 1

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node not found. Install Node.js (see .nvmrc) or nvm, then try again." >&2
    exit 1
fi

exec node "$ROOT_DIR/scripts/install.mjs" "$@"
