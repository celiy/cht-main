import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, "..", "..");
const CLIENTS_FILE = path.join(ROOT_DIR, "clients.json");
const CLIENT_CONFIG_FILE = "cht.config.json";

const DEFAULT_FRONTEND_BASE_DIR = "cht-base";
const DEFAULT_VITE_PORTS = [5173, 5174];

const SKIP_DISCOVERY_DIRS = new Set([
    "node_modules",
    ".git",
    "cht-base",
    "cht-design-system",
    "cht-shared",
    "scripts",
    "builds",
    "dist"
]);

let cachedFile = null;
let cachedShared = null;
let cachedClients = null;

export function getRootDir() {
    return ROOT_DIR;
}

export function clearClientDiscoveryCache() {
    cachedClients = null;
}

/**
 * @param {string} name
 * @returns {{ dir: string, configPath: string, config: object } | null}
 */
function getDiscoveredClient(name) {
    return discoverClients().get(name) ?? null;
}

export function getClientConfigPath(name) {
    const found = getDiscoveredClient(name);

    if (!found) {
        return path.join(ROOT_DIR, name, CLIENT_CONFIG_FILE);
    }

    return found.configPath;
}

export function getClientDir(name) {
    const found = getDiscoveredClient(name);

    if (!found) {
        throw new Error(
            `[clients] No ${CLIENT_CONFIG_FILE} found for "${name}". ` +
                `Place the file in a sibling folder of cht-main. Known: ${["dev", ...listClientNames()].join(", ")}.`
        );
    }

    return found.dir;
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
 * @returns {{ frontend?: { repo?: string, ref?: string }, backend?: { repo?: string, ref?: string } } | null}
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

function parseClientConfigFile(configPath) {
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

    return parsed;
}

/**
 * Discover sibling folders that contain `cht.config.json`. The folder name is
 * free; the client id comes from `name` in that file.
 *
 * @returns {Map<string, { dir: string, configPath: string, config: object }>}
 */
function discoverClients() {
    if (cachedClients) {
        return cachedClients;
    }

    const found = new Map();

    if (!fs.existsSync(ROOT_DIR)) {
        cachedClients = found;

        return cachedClients;
    }

    for (const entry of fs.readdirSync(ROOT_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory() || SKIP_DISCOVERY_DIRS.has(entry.name) || entry.name.startsWith(".")) {
            continue;
        }

        const configPath = path.join(ROOT_DIR, entry.name, CLIENT_CONFIG_FILE);

        if (!fs.existsSync(configPath)) {
            continue;
        }

        const config = parseClientConfigFile(configPath);
        const name = typeof config.name === "string" ? config.name.trim() : "";

        if (!name) {
            throw new Error(`[clients] Missing "name" in ${configPath}.`);
        }

        const existing = found.get(name);

        if (existing) {
            throw new Error(
                `[clients] Duplicate client name "${name}" in ${existing.dir}/ and ${entry.name}/.`
            );
        }

        found.set(name, {
            dir: entry.name,
            configPath,
            config
        });
    }

    cachedClients = found;

    return cachedClients;
}

/**
 * @returns {string[]} Client ids from `cht.config.json` → `name`
 */
export function listClientNames() {
    return [...discoverClients().keys()].sort();
}

/**
 * Read `cht.config.json` for a discovered client.
 *
 * @param {string} name Client id (`cht.config.json` → `name`)
 * @returns {object}
 */
export function loadClientConfig(name) {
    const found = getDiscoveredClient(name);

    if (!found) {
        const known = ["dev", ...listClientNames()].join(", ");

        throw new Error(
            `[clients] Missing ${CLIENT_CONFIG_FILE} for "${name}". ` +
                `A repo is a CHT client when that file exists in a sibling folder. Known: ${known}.`
        );
    }

    return found.config;
}

/**
 * @param {object | null | undefined} backend
 * @param {string} name
 * @returns {object | null}
 */
export function resolveBackendConfig(backend, name) {
    if (!backend || typeof backend !== "object") {
        return null;
    }

    const dir = typeof backend.dir === "string" ? backend.dir.trim() : "";

    if (!dir) {
        throw new Error(
            `[clients] "${name}" has a backend block but no "backend.dir". ` +
                `Set the folder relative to the workspace root (example: "my-api").`
        );
    }

    const cmd =
        typeof backend.cmd === "string" && backend.cmd.trim()
            ? backend.cmd.trim()
            : `npm run ${backend.script || "dev"}`;

    let startCmd =
        typeof backend.startCmd === "string" && backend.startCmd.trim()
            ? backend.startCmd.trim()
            : "";

    if (!startCmd && backend.startScript) {
        startCmd = `npm run ${backend.startScript}`;
    }

    const packagedCmd =
        typeof backend.packagedCmd === "string" && backend.packagedCmd.trim()
            ? backend.packagedCmd.trim()
            : "";

    return {
        dir,
        cmd,
        startCmd: startCmd || cmd,
        packagedCmd: packagedCmd || null,
        packageWithElectron: backend.packageWithElectron !== false,
        repo: backend.repo || null,
        ref: typeof backend.ref === "string" && backend.ref.trim() ? backend.ref.trim() : null,
        host: backend.host || null,
        port: backend.port || null,
        portScanLimit: backend.portScanLimit || null,
        healthPath: backend.healthPath || null
    };
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
            siteTitle: "CHT-Base",
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

    const frontend = {
        dir: DEFAULT_FRONTEND_BASE_DIR,
        cmd: `npx cross-env CLIENT=${name} npm run dev:client`,
        clientDir: getClientDir(name),
        repo: frontendOverride.repo || null,
        ref: typeof frontendOverride.ref === "string" && frontendOverride.ref.trim()
            ? frontendOverride.ref.trim()
            : null
    };

    return {
        name,
        isDev: false,
        siteTitle: entry.siteTitle || name,
        frontend,
        backend: resolveBackendConfig(entry.backend, name)
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

/**
 * Debug FAB is on unless the client sets `devTools: false`
 * (or `{ "enabled": false }`) in cht.config.json.
 *
 * @param {object | null | undefined} config
 * @returns {boolean}
 */
export function isClientDevToolsEnabled(config) {
    const flag = config?.devTools;

    if (flag === false) {
        return false;
    }

    if (flag && typeof flag === "object" && flag.enabled === false) {
        return false;
    }

    return true;
}

/**
 * @param {object} resolved
 * @param {{ clientPort?: number, docsPort?: number }} [options]
 */
export function buildProcessList(resolved, options = {}) {
    const procs = [];
    const clientPort = options.clientPort ?? getVitePorts()[0] ?? 5173;
    const docsPort = options.docsPort;
    const docsUrl = docsPort ? `http://127.0.0.1:${docsPort}` : "";

    let frontendCmd = resolved.frontend.cmd;

    if (resolved.isDev) {
        frontendCmd = `npm run dev -- --port ${clientPort} --host 127.0.0.1`;
    } else {
        const envFlags = [`CLIENT=${resolved.name}`];

        if (docsUrl) {
            envFlags.push(`CHT_DEVAPP_URL=${docsUrl}`);
        }

        frontendCmd =
            `npx cross-env ${envFlags.join(" ")} npm run dev:client -- --port ${clientPort} --host 127.0.0.1`;
    }

    procs.push({
        id: "front-end",
        name: "front-end",
        dir: path.join(ROOT_DIR, resolved.frontend.dir),
        cmd: frontendCmd,
        subtitle: resolved.isDev ? "cht-base (dev)" : resolved.frontend.clientDir
    });

    if (!resolved.isDev && docsPort) {
        procs.push({
            id: "docs",
            name: "docs",
            dir: path.join(ROOT_DIR, DEFAULT_FRONTEND_BASE_DIR),
            cmd: `npx cross-env CHT_DEVAPP=1 npm run dev -- --port ${docsPort} --strictPort --host 127.0.0.1`,
            subtitle: `devApp :${docsPort}`,
            env: {
                CHT_DEVAPP: "1"
            }
        });
    }

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
