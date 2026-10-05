/**
 * Reads cht.config.ts / cht.config.json from a client folder.
 * Lives in cht-main so `npx chtmain install` works before cht-base is cloned.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Filenames tried in order. The first that exists wins. */
export const CLIENT_CONFIG_FILENAMES = [
    "cht.config.ts",
    "cht.config.mts",
    "cht.config.mjs",
    "cht.config.js",
    "cht.config.json"
];

const STDOUT_MARKER = "__CHT_CLIENT_CONFIG__";

const loadCache = new Map();

/**
 * Finds the client config path in a directory
 * @param {string} dir The client folder
 * @returns {string | null} The config path
 */
export function findClientConfigPath(dir) {
    for (const filename of CLIENT_CONFIG_FILENAMES) {
        const configPath = path.join(dir, filename);

        if (fs.existsSync(configPath) && fs.statSync(configPath).isFile()) {
            return configPath;
        }
    }

    return null;
}

/**
 * Clears the in-process config cache
 * @returns {void}
 */
export function clearClientConfigLoadCache() {
    loadCache.clear();
}

/**
 * Reads the exported client config from a sibling folder
 * @param {string} dir Absolute or relative client folder
 * @returns {{ configPath: string; config: Record<string, unknown> }} Path and plain object
 */
export function loadClientConfigFromDir(dir) {
    const absDir = path.resolve(dir);
    const cached = loadCache.get(absDir);

    if (cached) {
        return cached;
    }

    const configPath = findClientConfigPath(absDir);

    if (!configPath) {
        throw new Error(
            `[configs] No cht.config.ts or cht.config.json in ${absDir}.`
        );
    }

    const config = path.extname(configPath) === ".json"
        ? parseJsonConfig(configPath)
        : parseModuleConfig(configPath);

    const result = { configPath, config };

    loadCache.set(absDir, result);

    return result;
}

/**
 * Parses a JSON client config
 * @param {string} configPath The JSON path
 * @returns {Record<string, unknown>} The config object
 */
function parseJsonConfig(configPath) {
    const raw = fs.readFileSync(configPath, "utf8");
    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        throw new Error(`[configs] Invalid JSON in ${configPath}: ${message}`);
    }

    return asConfigObject(parsed, configPath);
}

/**
 * Evaluates a JS/TS client config in a child Node process and JSON-clones the export
 * @param {string} configPath The module path
 * @returns {Record<string, unknown>} The config object
 */
function parseModuleConfig(configPath) {
    const href = pathToFileURL(configPath).href;
    const script = `
        const mod = await import(${JSON.stringify(href)});
        const value = mod.default ?? mod.config;
        process.stdout.write(${JSON.stringify(STDOUT_MARKER)} + JSON.stringify(value));
    `;

    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: path.dirname(configPath),
        encoding: "utf8",
        env: process.env,
        maxBuffer: 5 * 1024 * 1024
    });

    if (result.status !== 0) {
        const detail = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;

        throw new Error(`[configs] Failed to load ${configPath}: ${detail}`);
    }

    const stdout = result.stdout ?? "";
    const markerAt = stdout.lastIndexOf(STDOUT_MARKER);

    if (markerAt < 0) {
        throw new Error(`[configs] ${configPath} produced no config export.`);
    }

    let parsed;

    try {
        parsed = JSON.parse(stdout.slice(markerAt + STDOUT_MARKER.length));
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        throw new Error(`[configs] ${configPath} export is not JSON-serializable: ${message}`);
    }

    return asConfigObject(parsed, configPath);
}

/**
 * Asserts the export is a plain object
 * @param {unknown} value The export
 * @param {string} configPath The config path
 * @returns {Record<string, unknown>} The object
 */
function asConfigObject(value, configPath) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`[configs] ${configPath} must default-export a plain object.`);
    }

    return value;
}
