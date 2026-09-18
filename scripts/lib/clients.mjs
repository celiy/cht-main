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

let cachedFile = null;
let cachedShared = null;
let cachedClientNames = null;

export function getRootDir() {
    return ROOT_DIR;
}

export function clearClientDiscoveryCache() {
    cachedClientNames = null;
}

export function getClientConfigPath(name) {
    return path.join(ROOT_DIR, `${CLIENT_DIR_PREFIX}${name}`, CLIENT_CONFIG_FILE);
}

export function getClientDir(name) {
    return `${CLIENT_DIR_PREFIX}${name}`;
}

function loadClientsFile() {
    if (cachedFile) {
        return cachedFile;
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

    cachedFile = parsed;
    cachedShared = parsed.shared || {};

    return cachedFile;
}

function loadSharedFile() {
    loadClientsFile();

    return cachedShared;
}

/**
 * Bootstrap entries in clients.json so `install --client:<name>` can clone
 * frontend/backend before the local folder exists.
 *
 * @param {string} name
 * @returns {{ frontend?: { repo?: string }, backend?: { repo?: string } } | null}
 */
export function getCataloguedClient(name) {
    const file = loadClientsFile();
    const catalog = file.clients && typeof file.clients === "object" ? file.clients : {};
    const entry = catalog[name];

    if (!entry || typeof entry !== "object") {
        return null;
    }

    return entry;
}

export function listCataloguedClientNames() {
    const file = loadClientsFile();
    const catalog = file.clients && typeof file.clients === "object" ? file.clients : {};

    return Object.keys(catalog).sort();
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

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg.startsWith("--client:")) {
            client = arg.slice("--client:".length);

            continue;
        }

        if (arg === "--client" || arg === "-c") {
            const next = argv[i + 1];

            if (next && !next.startsWith("-")) {
                client = next;
                i += 1;
            }

            continue;
        }

        rest.push(arg);
    }

    return { client, rest };
}

/**
 * Parse a positional client argument, e.g.:
 *   npm run build -- mecarvit
 *   npx chtmain build mecarvit
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
