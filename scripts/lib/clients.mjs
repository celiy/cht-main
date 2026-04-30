import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, "..", "..");
const CLIENTS_FILE = path.join(ROOT_DIR, "clients.json");

const DEFAULT_FRONTEND_BASE_DIR = "cht-base";
const DEFAULT_VITE_PORTS = [5173, 5174];

let cachedFile = null;

export function getRootDir() {
    return ROOT_DIR;
}

export function loadClientsFile() {
    if (cachedFile) {
        return cachedFile;
    }

    if (!fs.existsSync(CLIENTS_FILE)) {
        throw new Error(`[clients] Missing ${CLIENTS_FILE}. Create it with at least an empty "clients" array.`);
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

    if (!Array.isArray(parsed.clients)) {
        throw new Error(`[clients] Expected "clients" to be an array in ${CLIENTS_FILE}.`);
    }

    cachedFile = {
        clients: parsed.clients,
        shared: parsed.shared || {}
    };

    return cachedFile;
}

export function listClientNames() {
    const { clients } = loadClientsFile();

    return clients.map((entry) => entry.name);
}

export function getSharedRepos() {
    const { shared } = loadClientsFile();

    return Array.isArray(shared.repos) ? shared.repos : [];
}

export function getVitePorts() {
    const { shared } = loadClientsFile();

    if (Array.isArray(shared.vitePorts) && shared.vitePorts.length > 0) {
        return shared.vitePorts;
    }

    return DEFAULT_VITE_PORTS;
}

function findClientEntry(name) {
    const { clients } = loadClientsFile();

    return clients.find((entry) => entry.name === name) || null;
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

    const entry = findClientEntry(name);

    if (!entry) {
        const known = ["dev", ...listClientNames()].join(", ");

        throw new Error(`[clients] Unknown client "${name}". Known: ${known}.`);
    }

    const frontendOverride = entry.frontend || {};
    const backendOverride = entry.backend || null;

    const frontend = {
        dir: DEFAULT_FRONTEND_BASE_DIR,
        cmd: `npm run ${frontendOverride.script || entry.name}`,
        clientDir: frontendOverride.dir || `cht-client-${entry.name}`,
        repo: frontendOverride.repo || null,
        clientRepo: frontendOverride.clientRepo || frontendOverride.repo || null
    };

    let backend = null;

    if (backendOverride) {
        backend = {
            dir: backendOverride.dir || `cht-backend-${entry.name}`,
            cmd: `npm run ${backendOverride.script || "dev"}`,
            repo: backendOverride.repo || null
        };
    }

    return {
        name: entry.name,
        isDev: false,
        siteTitle: entry.siteTitle || entry.name,
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
