#!/usr/bin/env node
/**
 * Temporarily mounts `@client/*` (and client ambient `.d.ts`) in
 * cht-base/tsconfig.app.json for vue-tsc during build, then removes them so
 * the default file stays clean.
 *
 * Runtime alias is still Vite + CLIENT; this only exists for typecheck.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getClientDir, getRootDir, parseClientFlag } from "./lib/clients.mjs";

const ROOT_DIR = getRootDir();
const TSCONFIG_PATH = path.join(ROOT_DIR, "cht-base", "tsconfig.app.json");

const CLIENT_ENTRY_RE =
    /,?\s*(?:\/\/[^\n]*\n\s*)*"@client\/\*"\s*:\s*\[[^\]]*\]/g;

/** Mounted include for client ambient globals (e.g. `$mecarvit`). */
const CLIENT_DTS_INCLUDE_RE =
    /,?\s*(?:\/\/[^\n]*\n\s*)*"\.\.\/[^"]+\/src\/\*\*\/\*\.d\.ts"/g;

function resolveClientPath(client) {
    const name = String(client ?? "").trim();

    if (!name || name === "dev") {
        return "./src/devApp/*";
    }

    return `../${getClientDir(name)}/src/*`;
}

/**
 * @param {string} client
 * @returns {string | null}
 */
function resolveClientDtsInclude(client) {
    const name = String(client ?? "").trim();

    if (!name || name === "dev") {
        return null;
    }

    return `../${getClientDir(name)}/src/**/*.d.ts`;
}

function readTsconfig() {
    if (!fs.existsSync(TSCONFIG_PATH)) {
        throw new Error(`[mount-client-tsconfig] missing ${TSCONFIG_PATH}`);
    }

    return fs.readFileSync(TSCONFIG_PATH, "utf8");
}

function writeTsconfig(content) {
    fs.writeFileSync(TSCONFIG_PATH, content, "utf8");
}

/**
 * Removes any `@client/*` path entry and mounted client `.d.ts` include.
 * @returns {{ changed: boolean }}
 */
export function unmountClientTsconfig() {
    const raw = readTsconfig();
    const updated = raw
        .replace(CLIENT_ENTRY_RE, "")
        .replace(CLIENT_DTS_INCLUDE_RE, "");

    if (updated === raw) {
        return { changed: false };
    }

    writeTsconfig(updated);

    return { changed: true };
}

/**
 * Mounts a single `@client/*` path (and client ambient `.d.ts`) for typecheck.
 * @param {string} client
 * @returns {{ changed: boolean, clientPath: string }}
 */
export function mountClientTsconfig(client) {
    unmountClientTsconfig();

    const clientPath = resolveClientPath(client);
    const dtsInclude = resolveClientDtsInclude(client);
    let raw = readTsconfig();
    const pathInsert = [
        ",",
        "            // Mounted for build only; removed when the build finishes.",
        `            "@client/*": ["${clientPath}"]`
    ].join("\n");

    if (!/"vue-router"\s*:\s*\[[^\]]*\]/.test(raw)) {
        throw new Error(
            `[mount-client-tsconfig] "vue-router" path not found in ${TSCONFIG_PATH}`
        );
    }

    raw = raw.replace(/("vue-router"\s*:\s*\[[^\]]*\])/, `$1${pathInsert}`);

    if (dtsInclude) {
        if (!/"electron\/types\.ts"/.test(raw)) {
            throw new Error(
                `[mount-client-tsconfig] "electron/types.ts" include not found in ${TSCONFIG_PATH}`
            );
        }

        const includeInsert = [
            ",",
            "        // Mounted for build only; removed when the build finishes.",
            `        "${dtsInclude}"`
        ].join("\n");

        raw = raw.replace(/("electron\/types\.ts")/, `$1${includeInsert}`);
    }

    writeTsconfig(raw);

    return { changed: true, clientPath };
}

/**
 * Mounts `@client`, runs `fn`, always unmounts afterward (including on throw).
 * @template T
 * @param {string} client
 * @param {() => T} fn
 * @returns {T}
 */
export function withClientTsconfig(client, fn) {
    mountClientTsconfig(client);

    const restore = () => {
        try {
            unmountClientTsconfig();
        } catch {
            // Best-effort cleanup.
        }
    };

    process.on("exit", restore);

    try {
        return fn();
    } finally {
        process.off("exit", restore);
        restore();
    }
}

const isDirectInvocation =
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectInvocation) {
    const args = process.argv.slice(2);

    if (args.includes("--unmount")) {
        unmountClientTsconfig();
        process.exit(0);
    }

    const { client } = parseClientFlag(args);
    const name = client || process.env.CLIENT || "dev";

    mountClientTsconfig(name);
}
