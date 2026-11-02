/**
 * The git submodules module
 * This module is responsible for reading which core repos cht-main registers as git submodules.
 */

import { spawnSync } from "node:child_process";

/**
 * Parse the output of `git config -f .gitmodules --get-regexp "^submodule\..*\.(path|branch)$"`
 * @param {string} output One `submodule.<name>.<key> <value>` entry per line.
 * @returns {{ name: string, path: string, branch?: string }[]} The registered submodules.
 */
export function parseGitmodulesConfig(output) {
    /** @type {Map<string, { name: string, path?: string, branch?: string }>} */
    const byName = new Map();

    for (const line of output.split("\n")) {
        const match = /^submodule\.(.+)\.(path|branch)\s+(.+)$/.exec(line.trim());

        if (!match) {
            continue;
        }

        const [, name, key, value] = match;
        const entry = byName.get(name) ?? { name };

        entry[key] = value.trim();
        byName.set(name, entry);
    }

    return [...byName.values()].filter((entry) => entry.path);
}

/**
 * Submodules that are registered in `.gitmodules` and also tracked as a gitlink in the index.
 * Empty when the repo has none, so callers can fall back to plain clones.
 *
 * @param {string} root The cht-main directory.
 * @returns {{ name: string, path: string, branch?: string }[]} The submodules.
 */
export function listSubmodules(root) {
    const config = spawnSync(
        "git",
        ["config", "-f", ".gitmodules", "--get-regexp", "^submodule\\..*\\.(path|branch)$"],
        { cwd: root, encoding: "utf8" }
    );

    if (config.status !== 0) {
        return [];
    }

    const staged = spawnSync("git", ["ls-files", "-s"], { cwd: root, encoding: "utf8" });
    const gitlinks = new Set(
        (staged.status === 0 ? staged.stdout : "")
            .split("\n")
            .filter((line) => line.startsWith("160000"))
            .map((line) => line.split("\t")[1])
    );

    return parseGitmodulesConfig(config.stdout).filter((entry) => gitlinks.has(entry.path));
}
