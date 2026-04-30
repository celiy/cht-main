#!/usr/bin/env node
// Regenerate the `@client/*` path array in cht-base/tsconfig.app.json from
// clients.json. This is purely for IDE / vue-tsc support: the runtime alias
// is already dynamic via vite.config.ts (CLIENT env -> resolveClientDir).
//
// TypeScript resolves `paths` to the first entry that exists on disk, so
// listing every known client makes the IDE pick whichever client repo is
// currently checked out without manual edits.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRootDir, listClientNames } from "./lib/clients.mjs";

const ROOT_DIR = getRootDir();
const TSCONFIG_PATH = path.join(ROOT_DIR, "cht-base", "tsconfig.app.json");

function buildClientPaths() {
    const names = listClientNames();

    if (names.length === 0) {
        return [`../cht-client-_/src/*`];
    }

    return names.map((name) => `../cht-client-${name}/src/*`);
}

function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
        return false;
    }

    if (a.length !== b.length) {
        return false;
    }

    return a.every((value, idx) => value === b[idx]);
}

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
    fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Replace the `@client/*` array in tsconfig.app.json without reformatting
 * the rest of the file. We use a regex on the raw text so existing comments
 * and indentation are preserved.
 */
function syncClientPaths({ silent = false } = {}) {
    if (!fs.existsSync(TSCONFIG_PATH)) {
        if (!silent) {
            console.warn(`[sync-tsconfig] missing ${TSCONFIG_PATH}, skip.`);
        }

        return { changed: false };
    }

    const raw = readText(TSCONFIG_PATH);
    const desired = buildClientPaths();
    const desiredJson = JSON.stringify(desired);

    const pattern = /("@client\/\*"\s*:\s*)(\[[^\]]*\])/;
    const match = raw.match(pattern);

    if (!match) {
        if (!silent) {
            console.warn(`[sync-tsconfig] "@client/*" entry not found in ${TSCONFIG_PATH}.`);
        }

        return { changed: false };
    }

    const currentJson = match[2].replace(/\s+/g, "");
    const desiredCompact = desiredJson.replace(/\s+/g, "");

    if (currentJson === desiredCompact) {
        if (!silent) {
            console.log(`[sync-tsconfig] up-to-date (${desired.length} client path(s)).`);
        }

        return { changed: false };
    }

    const updated = raw.replace(pattern, (_full, head) => `${head}${desiredJson}`);

    writeText(TSCONFIG_PATH, updated);

    if (!silent) {
        console.log(`[sync-tsconfig] updated ${path.relative(ROOT_DIR, TSCONFIG_PATH)}:`);

        for (const entry of desired) {
            console.log(`  - ${entry}`);
        }
    }

    return { changed: true };
}

export function syncTsconfig(opts) {
    return syncClientPaths(opts);
}

const isDirectInvocation =
    process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectInvocation) {
    syncClientPaths();
}
