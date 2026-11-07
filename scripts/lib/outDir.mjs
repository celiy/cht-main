import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findClientConfigPath } from "./loadClientConfig.mjs";

/** Folders of the workspace that hold source and must never be an export target */
const CORE_DIRS = ["cht-base", "cht-design-system", "cht-shared", "scripts"];

/**
 * Whether `inner` is `outer` or lives inside it
 * @param {string} outer The outer folder.
 * @param {string} inner The inner folder.
 * @returns {boolean} True when inner is outer or inside outer.
 */
function isSameOrInside(outer, inner) {
    const relative = path.relative(outer, inner);

    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Explain why a folder cannot be wiped by `build --out`, or return null when it is safe.
 * The export folder is deleted before the copy, so anything that holds source must be refused.
 *
 * @param {string} outDist The absolute export folder.
 * @param {string} root The cht-main directory.
 * @param {string[]} clientDirs The absolute folders of the known clients.
 * @returns {string | null} The reason, or null.
 */
export function findUnsafeOutDir(outDist, root, clientDirs) {
    if (outDist === path.parse(outDist).root || outDist === os.homedir()) {
        return "it is the filesystem root or your home folder";
    }

    if (isSameOrInside(outDist, root)) {
        return "it contains the workspace";
    }

    const coreDirs = CORE_DIRS.map((name) => path.join(root, name));
    const core = coreDirs.find((dir) => isSameOrInside(dir, outDist) || isSameOrInside(outDist, dir));

    if (core) {
        return `it overlaps ${path.relative(root, core)}, which holds source`;
    }

    const client = clientDirs.find((dir) => isSameOrInside(outDist, dir));

    if (client) {
        return `it is, or contains, the client folder ${path.relative(root, client) || client}`;
    }

    if (fs.existsSync(path.join(outDist, ".git"))) {
        return "it is a git repository";
    }

    if (findClientConfigPath(outDist)) {
        return "it has a cht.config, so it is a client folder";
    }

    return null;
}
