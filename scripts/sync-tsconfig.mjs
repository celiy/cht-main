#!/usr/bin/env node
// Regenerate the `@client/*` path array in cht-base/tsconfig.app.json from
// discovered sibling folders that contain `cht.config.json`. This is
// purely for IDE / vue-tsc support: the runtime alias is already dynamic via
// vite.config.ts (CLIENT env -> resolveClientDir).
//
// TypeScript resolves `paths` to the first entry that exists on disk.
// `CLIENT` (or syncTsconfig({ client })) is placed first so `vue-tsc -b`
// typechecks the active app, not always `src/devApp`. Without CLIENT the
// stub stays first for the docs IDE.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getClientDir, getRootDir, listClientNames, parseClientFlag } from "./lib/clients.mjs";

const ROOT_DIR = getRootDir();
const TSCONFIG_PATH = path.join(ROOT_DIR, "cht-base", "tsconfig.app.json");

function activeClientName(explicit) {
    if (explicit != null && String(explicit).trim()) {
        return String(explicit).trim();
    }

    return (process.env.CLIENT ?? "").trim();
}

function buildClientPaths(explicitClient) {
    const names = listClientNames();
    const clientPaths = names.map((name) => `../${getClientDir(name)}/src/*`);
    const devApp = "./src/devApp/*";
    const client = activeClientName(explicitClient);

    if (!client || client === "dev") {
        return [devApp, ...clientPaths];
    }

    if (!names.includes(client)) {
        return [devApp, ...clientPaths];
    }

    const active = `../${getClientDir(client)}/src/*`;

    return [active, ...clientPaths.filter((entry) => entry !== active), devApp];
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
function syncClientPaths({ silent = false, client } = {}) {
    if (!fs.existsSync(TSCONFIG_PATH)) {
        if (!silent) {
            console.warn(`[sync-tsconfig] missing ${TSCONFIG_PATH}, skip.`);
        }

        return { changed: false };
    }

    const raw = readText(TSCONFIG_PATH);
    const desired = buildClientPaths(client);
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
    const { client } = parseClientFlag(process.argv.slice(2));
    syncClientPaths({ client });
}
