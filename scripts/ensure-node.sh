#!/usr/bin/env bash
# ensure-node.sh — load nvm and align Node/npm with the repo .nvmrc when nvm is available.
#
# Usage (source from repo wrappers):
#   . "$ROOT_DIR/scripts/ensure-node.sh"
#   ensure_node_from_nvmrc "$ROOT_DIR"

ensure_node_from_nvmrc() {
    local root="${1:-.}"
    local nvmrc="${root}/.nvmrc"

    if [[ ! -f "$nvmrc" ]]; then
        return 0
    fi

    local wanted
    wanted="$(tr -d '[:space:]' < "$nvmrc")"

    if [[ -z "$wanted" ]]; then
        return 0
    fi

    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
        echo "[node] .nvmrc pede Node ${wanted}, mas o nvm não está carregado (${NVM_DIR}/nvm.sh)." >&2
        echo "[node] Instale o nvm ou use Node ${wanted} manualmente; seguindo com \$(node -v 2>/dev/null || echo 'node ausente')." >&2

        return 0
    fi

    set +u
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    set -u

    echo "[node] nvm install ${wanted} (via .nvmrc)"

    if ! nvm install "${wanted}"; then
        echo "[node] nvm install falhou para ${wanted}." >&2

        return 1
    fi

    if ! nvm use "${wanted}"; then
        echo "[node] nvm use falhou para ${wanted}." >&2

        return 1
    fi

    echo "[node] ativo: $(node -v) · npm $(npm -v)"

    return 0
}
