#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "${1:-.}" && pwd)"
max_depth="${2:-2}"

echo "# Git changes in workspace"
echo
echo "Workspace: $workspace_root"
echo

mapfile -t git_dirs < <(
    find "$workspace_root" -maxdepth "$max_depth" -type d -name .git 2>/dev/null \
        | grep -v node_modules \
        | sort
)

if [[ "${#git_dirs[@]}" -eq 0 ]]; then
    echo "No git repositories found."
    exit 0
fi

for git_dir in "${git_dirs[@]}"; do
    repo="$(dirname "$git_dir")"
  repo_name="${repo#"$workspace_root"/}"
  if [[ "$repo_name" == "$repo" ]]; then
      repo_name="."
  fi

    if ! git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        continue
    fi

    status="$(git -C "$repo" status --porcelain)"
    unstaged="$(git -C "$repo" diff --no-color 2>/dev/null || true)"
    staged="$(git -C "$repo" diff --cached --no-color 2>/dev/null || true)"

    if [[ -z "$status" && -z "$unstaged" && -z "$staged" ]]; then
        continue
    fi

    echo "================================================================================"
    echo "REPO: $repo_name ($repo)"
    echo "================================================================================"
    echo

    if [[ -n "$status" ]]; then
        echo "## status"
        echo '```'
        echo "$status"
        echo '```'
        echo
    fi

    if [[ -n "$staged" ]]; then
        echo "## diff --cached"
        echo '```diff'
        echo "$staged"
        echo '```'
        echo
    fi

    if [[ -n "$unstaged" ]]; then
        echo "## diff"
        echo '```diff'
        echo "$unstaged"
        echo '```'
        echo
    fi
done
