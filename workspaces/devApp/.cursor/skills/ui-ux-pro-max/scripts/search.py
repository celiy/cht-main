#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Search - BM25 search engine for UI/UX style guides

CHT adaptation: --design-system / --persist are disabled (this monorepo already
has cht-design-system). Prefer --domain ux and --stack vue.

Usage: python search.py "<query>" [--domain <domain>] [--stack <stack>] [--max-results 3]

Domains: whatever CSVs exist under data/ (see core.CSV_CONFIG at runtime)
Stacks: whatever CSVs exist under data/stacks/ (see core.AVAILABLE_STACKS)
"""

import argparse
import json as json_module
import sys
import io
from core import CSV_CONFIG, AVAILABLE_STACKS, MAX_RESULTS, UNTRUNCATED_COLS, search, search_stack

# Force UTF-8 for stdout/stderr to handle emojis on Windows (cp1252 default)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

TRUNCATE_AT = 300

# Domains that invent visual brand / marketing structure — discouraged here.
_DISCOURAGED_DOMAINS = frozenset({
    "style", "color", "landing", "product", "typography", "google-fonts", "gsap"
})

_CHT_DESIGN_SYSTEM_BLOCK = (
    "Blocked in this CHT monorepo: --design-system / --persist invent a parallel "
    "visual system. Use cht-design-system + --domain ux (and --stack vue). "
    "See .cursor/skills/ui-ux-pro-max/SKILL.md."
)


def format_output(result, full=False):
    """Format results for Claude consumption (token-optimized)"""
    if "error" in result:
        return f"Error: {result['error']}"

    output = []
    if result.get("stack"):
        output.append("## UI Pro Max Stack Guidelines")
        output.append(f"**Stack:** {result['stack']} | **Query:** {result['query']}")
        if result.get("stack") == "vue":
            output.append(
                "**CHT note:** Prefer Options API + cht-design-system; ignore "
                "Composition API / script setup suggestions from this dataset."
            )
    else:
        output.append("## UI Pro Max Search Results")
        domain_note = result["domain"]
        if result.get("auto_detected"):
            domain_note += " (auto-detected"
            if result.get("runner_up_domain"):
                domain_note += f", runner-up: {result['runner_up_domain']}"
            domain_note += ")"
        output.append(f"**Domain:** {domain_note} | **Query:** {result['query']}")
        if result.get("domain") in _DISCOURAGED_DOMAINS:
            output.append(
                "**CHT note:** This domain tends to invent brand/style. Prefer "
                "existing tokens/components unless the user explicitly asked."
            )
    output.append(f"**Source:** {result['file']} | **Found:** {result['count']} results\n")

    if result["count"] == 0:
        redirect = result.get("redirect")
        if redirect:
            output.append(
                "This legacy style label is now modeled in the "
                f"`{redirect['domain']}` domain as `{redirect['id']}`. "
                "Search that domain instead of treating a page composition as a visual style."
            )
            return "\n".join(output)
        output.append(
            "No matches. This is not a match with an empty value -- the query "
            "did not hit the database. Retry with broader/different keywords "
            "before falling back to general defaults, and say explicitly that "
            "no database match was found if you do fall back."
        )
        suggestions = result.get("suggestions") or []
        if suggestions:
            output.append(f"**Closest known terms:** {', '.join(suggestions)}")
        return "\n".join(output)

    for i, row in enumerate(result["results"], 1):
        output.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if not full and key not in UNTRUNCATED_COLS and len(value_str) > TRUNCATE_AT:
                value_str = value_str[:TRUNCATE_AT] + "..."
            output.append(f"- **{key}:** {value_str}")
        output.append("")

    return "\n".join(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="UI Pro Max Search (CHT: prefer --domain ux / --stack vue; "
        "--design-system disabled)"
    )
    parser.add_argument("query", help="Search query")
    parser.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="Search domain")
    parser.add_argument(
        "--stack",
        "-s",
        choices=AVAILABLE_STACKS,
        help=f"Stack-specific search. Available: {', '.join(AVAILABLE_STACKS)}",
    )
    parser.add_argument(
        "--max-results",
        "-n",
        type=int,
        choices=range(1, 21),
        default=MAX_RESULTS,
        metavar="1-20",
        help="Max results (default: 3)",
    )
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Do not truncate long field values in text output",
    )
    # Kept for CLI compatibility; blocked below for this monorepo.
    parser.add_argument(
        "--design-system",
        "-ds",
        action="store_true",
        help="Blocked in CHT (see SKILL.md)",
    )
    parser.add_argument("--project-name", "-p", type=str, default=None, help=argparse.SUPPRESS)
    parser.add_argument(
        "--format",
        "-f",
        choices=["ascii", "markdown"],
        default="ascii",
        help=argparse.SUPPRESS,
    )
    parser.add_argument("--persist", action="store_true", help="Blocked in CHT (see SKILL.md)")
    parser.add_argument("--page", type=str, default=None, help=argparse.SUPPRESS)
    parser.add_argument("--output-dir", "-o", type=str, default=None, help=argparse.SUPPRESS)
    parser.add_argument("--force", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument(
        "--variance", type=int, choices=range(1, 11), metavar="1-10", help=argparse.SUPPRESS
    )
    parser.add_argument(
        "--motion", type=int, choices=range(1, 11), metavar="1-10", help=argparse.SUPPRESS
    )
    parser.add_argument(
        "--density", type=int, choices=range(1, 11), metavar="1-10", help=argparse.SUPPRESS
    )

    args = parser.parse_args()

    if args.design_system or args.persist:
        if args.json:
            print(json_module.dumps({"error": _CHT_DESIGN_SYSTEM_BLOCK}, ensure_ascii=False))
        else:
            print(f"Error: {_CHT_DESIGN_SYSTEM_BLOCK}", file=sys.stderr)
        sys.exit(2)

    if args.stack:
        result = search_stack(args.query, args.stack, args.max_results)
        if args.json:
            print(json_module.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_output(result, full=args.full))
    else:
        result = search(args.query, args.domain, args.max_results)
        if args.json:
            print(json_module.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_output(result, full=args.full))
