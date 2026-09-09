#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import {
    getRootDir,
    getVitePorts,
    listClientNames,
    loadClientConfig,
    parsePositionalClientArg,
    resolveClient
} from "./lib/clients.mjs";
import { freePorts } from "./lib/procManager.mjs";

const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_BACKEND_PORT = 8000;
const DEFAULT_HEALTH_PATH = "/health";
const VITE_READY_TIMEOUT_MS = 60_000;

function printUsage() {
    const known = ["dev", ...listClientNames()].join(", ");

    console.log("Run or package a CHT client as an Electron desktop app.");
    console.log("");
    console.log("Usage:");
    console.log("  ./electron.sh <client>");
    console.log("  ./electron.sh build <client>");
    console.log("  npm run electron -- <client>");
    console.log("");
    console.log(`Known clients: ${known || "(none)"}`);
}

function run(command, args, cwd, extraEnv = {}) {
    const result = spawnSync(command, args, {
        cwd,
        stdio: "inherit",
        env: { ...process.env, ...extraEnv }
    });

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(" ")}`);
    }
}

function parseArgs(argv) {
    const rest = argv.filter((arg) => arg !== "build");
    const isBuild = argv.includes("build");
    const client = parsePositionalClientArg(rest);

    return { isBuild, client };
}

function vitePort() {
    return getVitePorts()[0] || 5173;
}

function healthUrl(host, port, healthPath) {
    const normalized = healthPath.startsWith("/") ? healthPath : `/${healthPath}`;

    return `http://${host}:${port}${normalized}`;
}

function backendStartCmd(backendDir, entry, packaged) {
    if (packaged) {
        const bin = process.platform === "win32" ? "tsx.cmd" : "tsx";

        return `node_modules/.bin/${bin} src/server.ts`;
    }

    const configured = entry?.startScript || "start";
    const packagePath = path.join(backendDir, "package.json");

    if (fs.existsSync(packagePath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

            if (pkg?.scripts?.[configured]) {
                return `npm run ${configured}`;
            }
        } catch {
            // Fall through to the web-dev script.
        }
    }

    return `npm run ${entry?.script || "dev"}`;
}

function buildRuntimeConfig({ root, resolved, isDev, packaged }) {
    const viteUrl = `http://127.0.0.1:${vitePort()}`;
    const entry = resolved.isDev ? null : loadClientConfig(resolved.name);
    const backendEntry = entry?.backend || null;
    const windowConfig = entry?.electron || {};

    let backend = null;

    if (resolved.backend) {
        const host = backendEntry?.host || DEFAULT_BACKEND_HOST;
        const port = Number(backendEntry?.port) || DEFAULT_BACKEND_PORT;
        const backendDir = packaged
            ? "backend"
            : path.join(root, resolved.backend.dir);

        backend = {
            dir: backendDir,
            cmd: backendStartCmd(
                path.join(root, resolved.backend.dir),
                backendEntry,
                packaged
            ),
            healthUrl: healthUrl(host, port, backendEntry?.healthPath || DEFAULT_HEALTH_PATH),
            host,
            port,
            nodePath: isDev ? process.execPath : undefined
        };
    }

    return {
        client: resolved.name,
        siteTitle: resolved.siteTitle,
        isDev,
        viteUrl: isDev ? viteUrl : undefined,
        hasBackend: Boolean(backend),
        backend,
        window: {
            width: windowConfig.width,
            height: windowConfig.height
        }
    };
}

function writeRuntimeConfig(baseDir, config) {
    const outDir = path.join(baseDir, "electron-dist");
    fs.mkdirSync(outDir, { recursive: true });

    const configPath = path.join(outDir, "runtime-config.json");
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 4)}\n`);

    return configPath;
}

function compileElectron(baseDir) {
    run("node", ["electron/build.mjs"], baseDir);
}

function waitForHttp(url, timeoutMs) {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        const attempt = () => {
            const request = http.get(url, (response) => {
                response.resume();

                if ((response.statusCode ?? 0) < 500) {
                    resolve();
                    return;
                }

                retry();
            });

            request.on("error", () => {
                retry();
            });

            request.setTimeout(1000, () => {
                request.destroy();
                retry();
            });
        };

        const retry = () => {
            if (Date.now() - startedAt >= timeoutMs) {
                reject(new Error(`Timeout waiting for ${url}`));
                return;
            }

            setTimeout(attempt, 250);
        };

        attempt();
    });
}

function spawnVite(baseDir, client, port) {
    const args = ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort", "--clearScreen", "false"];
    const env = { ...process.env };

    if (client !== "dev") {
        env.CLIENT = client;
    } else {
        delete env.CLIENT;
    }

    const child = spawn("npx", args, {
        cwd: baseDir,
        env,
        stdio: ["ignore", "inherit", "inherit"]
    });

    return child;
}

function writeBuilderConfig({ root, baseDir, resolved, backendAbsDir }) {
    const outDir = path.join(root, "builds", resolved.name, "desktop");
    const extraResources = [];

    if (backendAbsDir) {
        extraResources.push({
            from: backendAbsDir,
            to: "backend",
            filter: ["**/*", "!.git", "!.git/**", "!**/*.sqlite", "!data", "!data/**"]
        });
    }

    const config = {
        appId: `dev.cht.${resolved.name}`,
        productName: resolved.siteTitle,
        artifactName: `${resolved.name}-\${version}-\${os}-\${arch}.\${ext}`,
        directories: {
            output: outDir
        },
        files: ["dist/**/*", "electron-dist/**/*", "package.json"],
        extraResources,
        extraMetadata: {
            main: "electron-dist/main.cjs"
        },
        asar: true,
        linux: {
            target: ["AppImage", "deb", "dir"],
            category: "Utility",
            maintainer: "CHT",
            desktopName: resolved.name
        },
        win: {
            target: ["nsis", "portable"]
        },
        mac: {
            target: ["dmg", "zip"]
        }
    };

    const configPath = path.join(baseDir, "electron-dist", "electron-builder.json");
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 4)}\n`);

    return { configPath, outDir };
}

function assertKnownClient(client) {
    const known = ["dev", ...listClientNames()];

    if (!known.includes(client)) {
        console.error(`[electron] Unknown client "${client}".`);
        printUsage();
        process.exit(2);
    }
}

async function runDev(client) {
    const root = getRootDir();
    const baseDir = path.join(root, "cht-base");
    const resolved = resolveClient(client);
    const port = vitePort();
    const runtimeConfig = buildRuntimeConfig({
        root,
        resolved,
        isDev: true,
        packaged: false
    });

    compileElectron(baseDir);
    const configPath = writeRuntimeConfig(baseDir, runtimeConfig);
    freePorts([port]);

    console.log(`[electron] Starting Vite for "${resolved.name}" on port ${port}...`);

    const vite = spawnVite(baseDir, client, port);
    let electronProc = null;
    let exiting = false;

    const cleanup = () => {
        if (exiting) {
            return;
        }

        exiting = true;

        if (electronProc && electronProc.exitCode === null) {
            electronProc.kill("SIGTERM");
        }

        if (vite.exitCode === null) {
            vite.kill("SIGTERM");
        }
    };

    process.on("SIGINT", () => {
        cleanup();
        process.exit(130);
    });

    process.on("SIGTERM", () => {
        cleanup();
        process.exit(143);
    });

    vite.on("exit", (code) => {
        if (exiting) {
            return;
        }

        console.error(`[electron] Vite exited (${code ?? "null"}).`);
        cleanup();
        process.exit(code || 1);
    });

    await waitForHttp(runtimeConfig.viteUrl, VITE_READY_TIMEOUT_MS);

    console.log("[electron] Opening desktop window...");

    const electronEnv = {
        ...process.env,
        CHT_ELECTRON_CONFIG: configPath
    };

    delete electronEnv.ELECTRON_RUN_AS_NODE;

    const electronBin = path.join(baseDir, "node_modules", ".bin", "electron");

    electronProc = spawn(electronBin, ["electron-dist/main.cjs"], {
        cwd: baseDir,
        env: electronEnv,
        stdio: "inherit"
    });

    await new Promise((resolve) => {
        electronProc.on("exit", resolve);
    });

    cleanup();
}

function runBuild(client) {
    const root = getRootDir();
    const baseDir = path.join(root, "cht-base");
    const resolved = resolveClient(client);
    const runtimeConfig = buildRuntimeConfig({
        root,
        resolved,
        isDev: false,
        packaged: true
    });

    console.log(`[electron] Building frontend for "${resolved.name}"...`);

    const frontendEnv = {
        ELECTRON_BUILD: "1"
    };

    if (client === "dev") {
        run("npm", ["run", "build"], baseDir, frontendEnv);
    } else {
        run("npm", ["run", "build:client"], baseDir, {
            ...frontendEnv,
            CLIENT: client
        });
    }

    compileElectron(baseDir);
    writeRuntimeConfig(baseDir, runtimeConfig);

    const backendAbsDir = resolved.backend
        ? path.join(root, resolved.backend.dir)
        : null;

    if (backendAbsDir && !fs.existsSync(backendAbsDir)) {
        throw new Error(`[electron] Backend directory not found: ${backendAbsDir}`);
    }

    const { configPath, outDir } = writeBuilderConfig({
        root,
        baseDir,
        resolved,
        backendAbsDir
    });

    console.log("[electron] Packaging desktop app...");
    run("npx", ["electron-builder", "--config", configPath, "--linux"], baseDir);
    console.log(`[electron] Desktop artifacts at ${path.relative(root, outDir)}`);
}

async function main() {
    const argv = process.argv.slice(2);

    if (argv.includes("-h") || argv.includes("--help")) {
        printUsage();
        process.exit(0);
    }

    const { isBuild, client } = parseArgs(argv);

    if (!client) {
        printUsage();
        process.exit(1);
    }

    assertKnownClient(client);

    if (isBuild) {
        runBuild(client);
        return;
    }

    await runDev(client);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
