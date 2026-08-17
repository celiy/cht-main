import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, "..", "..");
const CLIENTS_FILE = path.join(ROOT_DIR, "clients.json");
const CLIENT_DIR_PREFIX = "cht-client-";
const CLIENT_CONFIG_FILE = "cht.config.json";

const DEFAULT_FRONTEND_BASE_DIR = "cht-base";
const DEFAULT_VITE_PORTS = [5173, 5174];

let cachedShared = null;
let cachedClientNames = null;

export function getRootDir() {
    return ROOT_DIR;
}

export function getClientConfigPath(name) {
    return path.join(ROOT_DIR, `${CLIENT_DIR_PREFIX}${name}`, CLIENT_CONFIG_FILE);
}

export function getClientDir(name) {
    return `${CLIENT_DIR_PREFIX}${name}`;
}

function loadSharedFile() {
    if (cachedShared) {
        return cachedShared;
    }

    if (!fs.existsSync(CLIENTS_FILE)) {
        throw new Error(`[clients] Missing ${CLIENTS_FILE}. Create it with a "shared" object.`);
    }

    const raw = fs.readFileSync(CLIENTS_FILE, "utf8");
    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`[clients] Invalid JSON in ${CLIENTS_FILE}: ${err.message}`);
    }

    if (!parsed || typeof parsed !== "object") {
        throw new Error(`[clients] Expected an object in ${CLIENTS_FILE}.`);
    }

    cachedShared = parsed.shared || {};

    return cachedShared;
}

/**
 * Discover local client folders matching `cht-client-<name>` that contain
 * a `cht.config.json` at the project root.
 *
 * @returns {string[]} Client names derived from folder suffixes
 */
export function listClientNames() {
    if (cachedClientNames) {
        return cachedClientNames;
    }

    if (!fs.existsSync(ROOT_DIR)) {
        cachedClientNames = [];

        return cachedClientNames;
    }

    const names = [];

    for (const entry of fs.readdirSync(ROOT_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith(CLIENT_DIR_PREFIX)) {
            continue;
        }

        const name = entry.name.slice(CLIENT_DIR_PREFIX.length);

        if (!name) {
            continue;
        }

        const configPath = path.join(ROOT_DIR, entry.name, CLIENT_CONFIG_FILE);

        if (!fs.existsSync(configPath)) {
            continue;
        }

        names.push(name);
    }

    names.sort();
    cachedClientNames = names;

    return cachedClientNames;
}

/**
 * Read and validate `cht.config.json` for a discovered client.
 *
 * @param {string} name Client name (folder suffix)
 * @returns {object}
 */
export function loadClientConfig(name) {
    const clientDir = getClientDir(name);
    const configPath = getClientConfigPath(name);

    if (!fs.existsSync(configPath)) {
        const known = ["dev", ...listClientNames()].join(", ");

        throw new Error(
            `[clients] Missing ${CLIENT_CONFIG_FILE} for "${name}" at ${clientDir}/. ` +
            `Clone the client repo first, then retry. Known: ${known}.`
        );
    }

    const raw = fs.readFileSync(configPath, "utf8");
    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`[clients] Invalid JSON in ${configPath}: ${err.message}`);
    }

    if (!parsed || typeof parsed !== "object") {
        throw new Error(`[clients] Expected an object in ${configPath}.`);
    }

    const configName = parsed.name || name;

    if (configName !== name) {
        throw new Error(
            `[clients] Config name "${configName}" does not match folder suffix "${name}" (${clientDir}).`
        );
    }

    return parsed;
}

export function getSharedRepos() {
    const shared = loadSharedFile();

    return Array.isArray(shared.repos) ? shared.repos : [];
}

export function getVitePorts() {
    const shared = loadSharedFile();

    if (Array.isArray(shared.vitePorts) && shared.vitePorts.length > 0) {
        return shared.vitePorts;
    }

    return DEFAULT_VITE_PORTS;
}

export function resolveClient(name) {
    if (!name || name === "dev") {
        return {
            name: "dev",
            isDev: true,
            siteTitle: "cht-base dev",
            frontend: {
                dir: DEFAULT_FRONTEND_BASE_DIR,
                cmd: "npm run dev",
                repo: null
            },
            backend: null
        };
    }

    const entry = loadClientConfig(name);
    const frontendOverride = entry.frontend || {};
    const backendOverride = entry.backend || null;

    const frontend = {
        dir: DEFAULT_FRONTEND_BASE_DIR,
        cmd: `npx cross-env CLIENT=${name} npm run dev:client`,
        clientDir: getClientDir(name),
        repo: frontendOverride.repo || null
    };

    let backend = null;

    if (backendOverride) {
        backend = {
            dir: backendOverride.dir || `cht-backend-${name}`,
            cmd: `npm run ${backendOverride.script || "dev"}`,
            repo: backendOverride.repo || null
        };
    }

    return {
        name,
        isDev: false,
        siteTitle: entry.siteTitle || name,
        frontend,
        backend
    };
}

export function parseClientFlag(argv) {
    let client = null;
    const rest = [];

    for (const arg of argv) {
        if (arg.startsWith("--client:")) {
            client = arg.slice("--client:".length);

            continue;
        }

        if (arg === "--client" || arg === "-c") {
            continue;
        }

        rest.push(arg);
    }

    return { client, rest };
}

/**
 * Parse a positional client argument, e.g.:
 *   npm run build -- mecarvit
 *   ./build.sh mecarvit
 */
export function parsePositionalClientArg(argv) {
    const args = argv.filter((arg) => !!arg && !arg.startsWith("-"));

    return args[0] || null;
}

export function buildProcessList(resolved) {
    const procs = [];

    procs.push({
        id: "front-end",
        name: "front-end",
        dir: path.join(ROOT_DIR, resolved.frontend.dir),
        cmd: resolved.frontend.cmd,
        subtitle: resolved.isDev ? "cht-base (dev)" : resolved.frontend.clientDir
    });

    if (resolved.backend) {
        procs.push({
            id: "back-end",
            name: "back-end",
            dir: path.join(ROOT_DIR, resolved.backend.dir),
            cmd: resolved.backend.cmd,
            subtitle: resolved.backend.dir
        });
    }

    return procs;
}
