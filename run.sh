#!/usr/bin/env bash
# run.sh - Multi-shell dev watcher for the cht-main monorepo.
#
# Spawns the relevant `npm run dev` processes for the chosen client (frontend
# in cht-base + backend if it exists) and shows them in a single terminal UI
# where the user can switch between each running shell using the left/right
# arrow keys.
#
# Usage:
#   ./run.sh --client:<name>
#
# Examples:
#   ./run.sh --client:mecarvit   # cht-base (CLIENT=mecarvit) + cht-backend-mecarvit
#   ./run.sh --client:dev        # only cht-base in plain dev mode (no backend)
#   ./run.sh                     # same as --client:dev
#
# Before spawning, default Vite ports 5173 and 5174 are freed so stale dev
# servers do not block startup (uses fuser when available, else lsof + kill).

set -u

# ---------------------------------------------------------------------------
# CLI parsing
# ---------------------------------------------------------------------------

CLIENT=""
for arg in "$@"; do
    case "$arg" in
        --client:*)
            CLIENT="${arg#--client:}"
            ;;
        -h|--help)
            sed -n '2,15p' "$0"
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg" >&2
            echo "Usage: $0 --client:<name>" >&2
            exit 2
            ;;
    esac
done

if [[ -z "$CLIENT" ]]; then
    CLIENT="dev"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# Resolve which shells to spawn for the chosen client
#
# Adds an entry per process: name + working directory + npm script to run.
# Add new clients here by appending to NAMES / DIRS / CMDS.
# ---------------------------------------------------------------------------

NAMES=()
DIRS=()
CMDS=()

case "$CLIENT" in
    dev)
        # Plain dev mode of cht-base only (lab routes, no client, no backend).
        NAMES+=("front-end")
        DIRS+=("$ROOT_DIR/cht-base")
        CMDS+=("npm run dev")
        ;;
    mecarvit)
        NAMES+=("front-end")
        DIRS+=("$ROOT_DIR/cht-base")
        CMDS+=("npm run mecarvit")

        NAMES+=("back-end")
        DIRS+=("$ROOT_DIR/cht-backend-mecarvit")
        CMDS+=("npm run dev")
        ;;
    *)
        echo "Unknown client: $CLIENT" >&2
        echo "Known clients: dev, mecarvit" >&2
        exit 2
        ;;
esac

NUM=${#NAMES[@]}

# ---------------------------------------------------------------------------
# Free common Vite dev ports (5173 primary, 5174 strictPort / second instance)
# ---------------------------------------------------------------------------

free_default_vite_ports() {
    local p pids

    for p in 5173 5174; do
        if command -v fuser >/dev/null 2>&1; then
            fuser -k "${p}/tcp" 2>/dev/null || true
        else
            pids="$(lsof -t -i:"$p" 2>/dev/null || true)"
            if [[ -n "$pids" ]]; then
                # shellcheck disable=SC2086
                kill $pids 2>/dev/null || true
            fi
        fi
    done

    sleep 0.15
}

# ---------------------------------------------------------------------------
# Spawn processes
#
# Each child writes to its own log file so the TUI can show whichever one is
# currently focused without losing the other streams. `stdbuf -oL -eL` keeps
# node/vite output line-buffered so logs appear promptly.
# ---------------------------------------------------------------------------

LOG_DIR="$(mktemp -d -t cht-run-XXXXXX)"
PIDS=()

cleanup() {
    trap - INT TERM EXIT
    # Restore terminal first so error messages from children are readable.
    stty "$STTY_SAVED" 2>/dev/null || true
    tput cnorm 2>/dev/null || true
    tput rmcup 2>/dev/null || true

    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            # Kill the whole process group so vite/tsx children also die.
            kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
        fi
    done

    sleep 0.2
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
        fi
    done

    rm -rf "$LOG_DIR" 2>/dev/null || true
}

STTY_SAVED="$(stty -g)"
trap cleanup INT TERM EXIT

free_default_vite_ports

for i in $(seq 0 $((NUM - 1))); do
    log_file="$LOG_DIR/$i.log"
    : > "$log_file"
    name="${NAMES[$i]}"
    dir="${DIRS[$i]}"
    cmd="${CMDS[$i]}"

    # setsid puts each child in its own process group so we can signal the
    # whole tree on cleanup. stdbuf forces line buffering for live output.
    setsid bash -c "cd \"$dir\" && exec stdbuf -oL -eL $cmd" \
        >"$log_file" 2>&1 &
    PIDS+=("$!")
done

# ---------------------------------------------------------------------------
# Terminal UI
#
# Alternate screen + raw input. We render the header (tabs) and the tail of
# the active log on every tick. Arrow keys (and h/l) switch the focused tab,
# `q` quits.
# ---------------------------------------------------------------------------

tput smcup
tput civis
stty -echo -icanon time 0 min 0

ACTIVE=0
EXIT_CODES=()
for _ in $(seq 0 $((NUM - 1))); do
    EXIT_CODES+=("")
done

proc_status() {
    # Echoes "running" or "exit <code>" for the i-th child.
    local idx="$1"
    local pid="${PIDS[$idx]}"

    if kill -0 "$pid" 2>/dev/null; then
        echo "running"
        return
    fi

    if [[ -n "${EXIT_CODES[$idx]:-}" ]]; then
        echo "exit ${EXIT_CODES[$idx]}"
        return
    fi

    # Reap and cache exit code so subsequent draws are cheap.
    local code=0
    wait "$pid" 2>/dev/null
    code=$?
    EXIT_CODES[$idx]="$code"
    echo "exit $code"
}

draw() {
    local rows cols header tab status
    rows=$(tput lines)
    cols=$(tput cols)

    tput cup 0 0
    tput ed

    header=""
    for i in $(seq 0 $((NUM - 1))); do
        status="$(proc_status "$i")"
        if [[ "$status" == "running" ]]; then
            label="${NAMES[$i]}"
        else
            label="${NAMES[$i]} ($status)"
        fi

        if [[ $i -eq $ACTIVE ]]; then
            tab="[ X $label ]"
        else
            tab="[   $label   ]"
        fi

        if [[ $i -gt 0 ]]; then
            header+=" / "
        fi
        header+="$tab"
    done

    printf '%s\n' "$header"
    printf '%*s\n' "$cols" '' | tr ' ' '-'

    local body_rows=$((rows - 3))
    if [[ $body_rows -lt 1 ]]; then
        body_rows=1
    fi

    tail -n "$body_rows" "$LOG_DIR/$ACTIVE.log" 2>/dev/null

    tput cup $((rows - 1)) 0
    printf '%s' "←/→ switch  |  q to quit  |  client=$CLIENT"
}

draw
LAST_DRAW=$(date +%s%N)

while true; do
    # Read one byte with a short timeout. Arrows arrive as ESC [ C / ESC [ D.
    IFS= read -rsn1 -t 0.2 ch || ch=""

    if [[ -n "$ch" ]]; then
        case "$ch" in
            $'\e')
                IFS= read -rsn2 -t 0.05 rest || rest=""
                case "$rest" in
                    "[C") ACTIVE=$(((ACTIVE + 1) % NUM)) ;;
                    "[D") ACTIVE=$(((ACTIVE - 1 + NUM) % NUM)) ;;
                esac
                draw
                LAST_DRAW=$(date +%s%N)
                continue
                ;;
            l|L) ACTIVE=$(((ACTIVE + 1) % NUM)); draw; LAST_DRAW=$(date +%s%N); continue ;;
            h|H) ACTIVE=$(((ACTIVE - 1 + NUM) % NUM)); draw; LAST_DRAW=$(date +%s%N); continue ;;
            q|Q) break ;;
        esac
    fi

    # Periodic refresh so live log updates are visible without keypresses.
    NOW=$(date +%s%N)
    if (( NOW - LAST_DRAW > 300000000 )); then
        draw
        LAST_DRAW=$NOW
    fi
done

cleanup
