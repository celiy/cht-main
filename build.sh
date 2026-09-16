#!/usr/bin/env bash
# build.sh - Thin wrapper that delegates to scripts/build.mjs.
#
# Usage:
#   ./build.sh <client>
#   npm run build -- <client>

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

exec node "$ROOT_DIR/scripts/build.mjs" "$@"
