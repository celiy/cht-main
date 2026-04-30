#!/usr/bin/env bash
# run.sh - Thin wrapper that delegates to the Ink-based dev runner.
#
# The actual TUI lives at scripts/runner/index.jsx and is launched via tsx
# so JSX runs without a build step. Client resolution is driven by
# clients.json at the repo root (single source of truth for the monorepo).
#
# Usage:
#   ./run.sh --client:<name>
#   ./run.sh                     # equivalent to --client:dev

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node not found. Install Node.js (v20+) and try again." >&2
    exit 1
fi

if [[ ! -d "$ROOT_DIR/node_modules/tsx" ]]; then
    echo "Installing root dev dependencies (first run)..." >&2
    (cd "$ROOT_DIR" && npm install --silent) || {
        echo "Error: failed to install root dependencies." >&2
        exit 1
    }
fi

exec node --import tsx "$ROOT_DIR/scripts/runner/index.jsx" "$@"
