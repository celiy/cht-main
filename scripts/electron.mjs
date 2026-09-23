#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
    getRootDir,
    getVitePorts,
    listClientNames,
    loadClientConfig,
    parsePositionalClientArg,
    resolveClient
} from "./lib/clients.mjs";
import { freePorts } from "./lib/procManager.mjs";
import { localBinPath, spawnSyncInherit, spawnWithPipes } from "./lib/runCommand.mjs";
import { bumpVersionDir, resolveRepoDir } from "./lib/version.mjs";
import { syncTsconfig } from "./sync-tsconfig.mjs";

const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_PORT_SCAN_LIMIT = 20;
const DEFAULT_HEALTH_PATH = "/health";
const DEFAULT_APP_VERSION = "1.0.0";
const BACKEND_ENTRY = "src/server.ts";
const VITE_READY_TIMEOUT_MS = 60_000;
const VERSION_FILE_CANDIDATES = ["version", "version.json", "version.txt"];
const PACKAGE_TARGETS = ["win", "linux", "mac"];
const STAGE_DIR = ".electron-stage";
const TRAY_ICON_NAME = "tray-icon.png";
const BACKEND_ROOT_SKIP_DIRS = new Set([".git", "data", "docs", "tests", "dist"]);
const SHARED_PACKAGE_DIR = "cht-shared";
const BACKEND_SKIP_FILES = new Set([
    "drizzle.config.ts",
    "vitest.config.ts",
    "package-lock.json",
    ".package-lock.json"
]);
const BACKEND_SKIP_PATTERNS = [/\.sqlite(-journal|-wal)?$/, /\.md$/, /\.test\.ts$/, /\.spec\.ts$/];

function printUsage() {
    const known = ["dev", ...listClientNames()].join(", ");

    console.log("Run or package a CHT client as an Electron desktop app.");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain electron <client>");
    console.log("  npx chtmain electron build <client> [--win|--linux|--mac] [--publish]");
    console.log("  npm run electron -- <client>");
    console.log("");
    console.log("Flags:");
    console.log("  --win|--linux|--mac  Packaging target (defaults to the host OS).");
    console.log("  --publish            Upload artifacts + latest.yml to the release feed.");
    console.log("  --bump [repo]        Bump the app version before building. Defaults to");
    console.log("                       the client's version file; pass a repo name (without");
    console.log("                       the `cht-` prefix) to bump another one.");
    console.log("");
    console.log(`Known clients: ${known || "(none)"}`);
}

function run(command, args, cwd, extraEnv = {}) {
    const result = spawnSyncInherit(command, args, { cwd, env: extraEnv });

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(" ")}`);
    }
}

function parseArgs(argv) {
    const withoutBuild = argv.filter((arg) => arg !== "build");
    const isBuild = argv.includes("build");
    const { shouldBump, bumpRepo, rest } = parseBumpArg(withoutBuild);
    const client = parsePositionalClientArg(rest);

    return {
        isBuild,
        client,
        target: parseTarget(argv),
        shouldPublish: argv.includes("--publish"),
        shouldBump,
        bumpRepo
    };
}

/**
 * `--bump` bumps the version of the client being built. `--bump <repo>` bumps a
 * named repo instead, where the name omits the `cht-` prefix. The value is
 * consumed so it is not mistaken for the positional client argument.
 *
 * @param {string[]} argv Arguments without the `build` subcommand.
 * @returns {{ shouldBump: boolean, bumpRepo: string | null, rest: string[] }}
 */
function parseBumpArg(argv) {
    const index = argv.indexOf("--bump");

    if (index === -1) {
        return { shouldBump: false, bumpRepo: null, rest: argv };
    }

    const rest = [...argv];

    rest.splice(index, 1);

    const candidate = rest[index];
    let bumpRepo = null;

    if (candidate && !candidate.startsWith("-")) {
        bumpRepo = candidate;
        rest.splice(index, 1);
    }

    return { shouldBump: true, bumpRepo, rest };
}

function vitePort() {
    return getVitePorts()[0] || 5173;
}

function healthUrl(host, port, healthPath) {
    const normalized = healthPath.startsWith("/") ? healthPath : `/${healthPath}`;

    return `http://${host}:${port}${normalized}`;
}

/**
 * Derive host/port from the client `apiBaseUrl` so the spawned backend listens
 * exactly where the frontend expects it.
 */
function clientApiBaseUrl(entry, target) {
    const fromTarget = entry?.api?.[target];

    if (typeof fromTarget === "string" && fromTarget.trim() !== "") {
        return fromTarget.trim();
    }

    if (typeof entry?.apiBaseUrl === "string" && entry.apiBaseUrl.trim() !== "") {
        return entry.apiBaseUrl.trim();
    }

    return null;
}

function apiEndpoint(apiBaseUrl) {
    if (!apiBaseUrl) {
        return null;
    }

    try {
        const url = new URL(apiBaseUrl);
        const fallbackPort = url.protocol === "https:" ? 443 : 80;

        return {
            host: url.hostname,
            port: Number(url.port) || fallbackPort
        };
    } catch {
        return null;
    }
}

/**
 * Read the app version from the workspace `version` file so the installer,
 * `app.getVersion()` and the updater feed all agree on one number.
 */
function readAppVersion(root) {
    for (const name of VERSION_FILE_CANDIDATES) {
        const filePath = path.join(root, name);

        if (!fs.existsSync(filePath)) {
            continue;
        }

        try {
            const raw = fs.readFileSync(filePath, "utf8");
            const match = raw.match(/^\s*version[:\s=]+(.+)$/im);

            if (match?.[1]) {
                return match[1].trim();
            }
        } catch {
            // Try the next candidate file.
        }
    }

    return null;
}

/**
 * The updater feed is published from the client repository, so the client
 * `version` file wins over the workspace one.
 *
 * @param {object} resolved - Resolved client entry.
 * @returns {string | null} Client version, when declared.
 */
function resolveClientVersion(resolved) {
    const clientDir = resolved.frontend?.clientDir;

    if (!clientDir) {
        return null;
    }

    return readAppVersion(path.resolve(clientDir));
}

/**
 * Bump the version before the build reads it, so the installer, the updater
 * feed and `app.getVersion()` all carry the new number.
 *
 * `--bump` targets the client being built; `--bump <repo>` targets a named repo
 * (name without the `cht-` prefix).
 *
 * @param {string} root Workspace root.
 * @param {object} resolved Resolved client entry.
 * @param {string | null} bumpRepo Explicit repo name, when given.
 */
function applyVersionBump(root, resolved, bumpRepo) {
    const clientDir = resolved.frontend?.clientDir;
    const dir = bumpRepo
        ? resolveRepoDir(root, bumpRepo)
        : clientDir
          ? path.resolve(root, clientDir)
          : null;

    if (!dir) {
        console.warn("[electron] --bump ignored: no version file for this client.");

        return;
    }

    if (!fs.existsSync(dir)) {
        throw new Error(`[electron] --bump target not found: ${dir}`);
    }

    const result = bumpVersionDir(dir);

    console.log(
        `[electron] Bumped ${path.relative(root, result.filePath)}: ${result.from} -> ${result.to}`
    );
}

function currentPlatformTarget() {
    if (process.platform === "win32") {
        return "win";
    }

    if (process.platform === "darwin") {
        return "mac";
    }

    return "linux";
}

/**
 * Accept `--win`, `--linux` or `--mac` to cross-select the packaging target.
 */
function parseTarget(argv) {
    for (const arg of argv) {
        const name = arg.startsWith("--") ? arg.slice(2) : "";

        if (PACKAGE_TARGETS.includes(name)) {
            return name;
        }
    }

    return currentPlatformTarget();
}

function parseGitHubRepo(repoUrl) {
    if (!repoUrl) {
        return null;
    }

    const match = String(repoUrl).match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);

    if (!match?.[1] || !match[2]) {
        return null;
    }

    return { owner: match[1], repo: match[2] };
}

/**
 * The update feed defaults to the client repo, since releases ship from there.
 */
function resolvePublish(entry) {
    const configured = entry?.publish;

    if (configured?.owner && configured?.repo) {
        return [
            {
                provider: configured.provider || "github",
                owner: configured.owner,
                repo: configured.repo
            }
        ];
    }

    const derived = parseGitHubRepo(entry?.frontend?.repo);

    if (derived) {
        return [{ provider: "github", owner: derived.owner, repo: derived.repo }];
    }

    return null;
}

/**
 * Windows installers need a real `.ico`; electron-builder can also derive one
 * from a large enough PNG.
 */
/**
 * Resolve the installer icon per platform. Windows needs `.ico`, Linux and
 * macOS prefer `.png`, so the same `build/` folder can hold both.
 *
 * @param {string} root - Workspace root.
 * @param {object} resolved - Resolved client entry.
 * @returns {{ win: string | null, linux: string | null, mac: string | null } | null}
 */
function resolveAppIcon(root, resolved) {
    const clientDir = resolved.frontend?.clientDir
        ? path.join(root, resolved.frontend.clientDir)
        : null;

    if (!clientDir) {
        return null;
    }

    const buildDir = path.join(clientDir, "build");

    const pick = (names) => {
        for (const name of names) {
            const candidate = path.join(buildDir, name);

            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return null;
    };

    return {
        win: pick(["icon.ico", "icon.png"]),
        linux: pick(["icon.png", "icon.ico"]),
        mac: pick(["icon.icns", "icon.png"])
    };
}

/**
 * Tray icon used by the desktop shell. A PNG works on every platform and keeps
 * the brand colors, so it is preferred over the `.ico` variant.
 *
 * @param {string} root Workspace root.
 * @param {object} resolved Resolved client entry.
 * @returns {string | null} Absolute path to the source icon.
 */
function resolveTrayIcon(root, resolved) {
    const clientDir = resolved.frontend?.clientDir
        ? path.join(root, resolved.frontend.clientDir)
        : null;

    if (!clientDir) {
        return null;
    }

    const buildDir = path.join(clientDir, "build");

    for (const name of ["icon.png", "icon.ico"]) {
        const candidate = path.join(buildDir, name);

        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function isNpmFamilyCommand(cmd) {
    return /^\s*npm(\s|$)/.test(cmd) || /^\s*npx\s/.test(cmd);
}

function backendStartCmd(resolvedBackend, packaged) {
    if (!resolvedBackend) {
        return "";
    }

    if (packaged) {
        if (resolvedBackend.packagedCmd) {
            return resolvedBackend.packagedCmd;
        }

        const candidate = resolvedBackend.startCmd || resolvedBackend.cmd;

        if (candidate && !isNpmFamilyCommand(candidate)) {
            return candidate;
        }

        const bin = process.platform === "win32" ? "tsx.cmd" : "tsx";

        return `node_modules/.bin/${bin} src/server.ts`;
    }

    return resolvedBackend.startCmd || resolvedBackend.cmd;
}

function buildRuntimeConfig({ root, resolved, isDev, packaged }) {
    const viteUrl = `http://127.0.0.1:${vitePort()}`;
    const entry = resolved.isDev ? null : loadClientConfig(resolved.name);
    const backendEntry = entry?.backend || null;
    const windowConfig = entry?.electron || {};
    const trayIconSource = resolveTrayIcon(root, resolved);

    let backend = null;

    if (resolved.backend && (!packaged || resolved.backend.packageWithElectron)) {
        const configuredEndpoint = apiEndpoint(clientApiBaseUrl(entry, "electron"));
        const host = backendEntry?.host || configuredEndpoint?.host || DEFAULT_BACKEND_HOST;
        const portScanLimit =
            Number(backendEntry?.portScanLimit) ||
            Number(entry?.apiPortScanLimit) ||
            DEFAULT_PORT_SCAN_LIMIT;
        const backendDir = packaged ? "backend" : path.join(root, resolved.backend.dir);

        backend = {
            dir: backendDir,
            cmd: backendStartCmd(resolved.backend, packaged),
            entry: BACKEND_ENTRY,
            healthUrl: healthUrl(host, 0, backendEntry?.healthPath || DEFAULT_HEALTH_PATH),
            host,
            port: 0,
            portScanLimit,
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
        trayIcon: packaged ? TRAY_ICON_NAME : (trayIconSource ?? undefined),
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
    const args = [
        "vite",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
        "--clearScreen",
        "false"
    ];
    const env = { ...process.env };

    if (client !== "dev") {
        env.CLIENT = client;
    } else {
        delete env.CLIENT;
    }

    const child = spawnWithPipes("npx", args, {
        cwd: baseDir,
        env,
        stdio: ["ignore", "inherit", "inherit"]
    });

    return child;
}

function shouldStageBackendPath(source, root) {
    const relative = path.relative(root, source);

    if (!relative) {
        return true;
    }

    const parts = relative.split(path.sep);
    const name = parts[parts.length - 1];

    if (parts.length === 1 && BACKEND_ROOT_SKIP_DIRS.has(name)) {
        return false;
    }

    if (name === ".bin" || name === ".cache" || name === ".git") {
        return false;
    }

    if (BACKEND_SKIP_FILES.has(name)) {
        return false;
    }

    return !BACKEND_SKIP_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Ship a plain Node runtime with the installer. Native addons in the backend
 * (`better-sqlite3`, `bcrypt`) are prebuilt for Node's ABI, so reusing Node
 * avoids the Electron ABI rebuild entirely.
 */
function stageNodeRuntime(stageRoot, target) {
    if (currentPlatformTarget() !== target) {
        console.warn(
            `[electron] Cannot bundle a ${target} Node runtime from a ${currentPlatformTarget()} host.`
        );
        console.warn("[electron] The packaged app will fall back to Electron's Node runtime.");

        return;
    }

    const source = process.env.CHT_NODE_BINARY || process.execPath;

    if (!fs.existsSync(source)) {
        console.warn(
            `[electron] Node binary not found at ${source}; skipping the bundled runtime.`
        );

        return;
    }

    const binaryName = target === "win" ? "node.exe" : "node";
    const destination = path.join(stageRoot, "node");

    fs.mkdirSync(destination, { recursive: true });

    const binaryPath = path.join(destination, binaryName);

    fs.copyFileSync(source, binaryPath);

    if (target !== "win") {
        fs.chmodSync(binaryPath, 0o755);
    }

    console.log(`[electron] Bundled Node runtime: ${path.basename(source)} (${target})`);
}

/**
 * `electron-builder` drops the `node_modules` folder sitting at the root of an
 * `extraResources` source, so the backend is staged one level deeper and the
 * whole stage root becomes the resources root.
 */
function prepareDesktopResources(root, baseDir, backendAbsDir, target, trayIconPath) {
    const needsStage = Boolean(backendAbsDir) || Boolean(trayIconPath);

    if (!needsStage) {
        return [];
    }

    const stageRoot = path.join(baseDir, STAGE_DIR, "resources");

    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.mkdirSync(stageRoot, { recursive: true });

    if (trayIconPath) {
        fs.copyFileSync(trayIconPath, path.join(stageRoot, TRAY_ICON_NAME));
    }

    if (!backendAbsDir) {
        return [{ from: stageRoot, to: "." }];
    }

    const backendDestination = path.join(stageRoot, "backend");

    fs.cpSync(backendAbsDir, backendDestination, {
        recursive: true,
        dereference: false,
        verbatimSymlinks: true,
        filter: (source) => shouldStageBackendPath(source, backendAbsDir)
    });

    if (!fs.existsSync(path.join(backendDestination, "node_modules", "tsx", "dist", "cli.mjs"))) {
        console.warn(
            "[electron] Backend node_modules/tsx is missing; run npm install in the backend."
        );
    }

    // The backend resolves `@shared/*` through `tsconfig.json` to `../cht-shared`,
    // so the shared package has to sit next to it in the resources folder.
    const sharedSource = path.join(root, SHARED_PACKAGE_DIR);

    if (fs.existsSync(sharedSource)) {
        fs.cpSync(sharedSource, path.join(stageRoot, SHARED_PACKAGE_DIR), {
            recursive: true,
            dereference: false,
            verbatimSymlinks: true,
            filter: (source) => shouldStageBackendPath(source, sharedSource)
        });
    } else {
        console.warn(
            `[electron] ${SHARED_PACKAGE_DIR} not found; the packaged backend may fail to start.`
        );
    }

    stageNodeRuntime(stageRoot, target);

    return [{ from: stageRoot, to: "." }];
}

function writeBuilderConfig({
    root,
    baseDir,
    resolved,
    extraResources,
    appVersion,
    publish,
    icon
}) {
    const outDir = path.join(root, "builds", resolved.name, "desktop");

    const config = {
        appId: `dev.cht.${resolved.name}`,
        productName: resolved.siteTitle,
        artifactName: `${resolved.name}-\${version}-\${os}-\${arch}.\${ext}`,
        directories: {
            output: outDir
        },
        files: ["dist/**/*", "electron-dist/**/*", "package.json", "!node_modules/**/*"],
        extraResources,
        extraMetadata: {
            main: "electron-dist/main.cjs",
            version: appVersion,
            name: resolved.name,
            description: resolved.siteTitle
        },
        asar: true,
        linux: {
            target: ["AppImage", "deb", "dir"],
            category: "Utility",
            maintainer: "CHT",
            executableName: resolved.name
        },
        win: {
            target: ["nsis"]
        },
        nsis: {
            oneClick: false,
            perMachine: false,
            allowToChangeInstallationDirectory: true,
            deleteAppDataOnUninstall: false,
            shortcutName: resolved.siteTitle,
            artifactName: `${resolved.name}-setup-\${version}.\${ext}`
        },
        mac: {
            target: ["dmg", "zip"]
        }
    };

    if (icon?.win) {
        config.win.icon = icon.win;
    }

    if (icon?.linux) {
        config.linux.icon = icon.linux;
    }

    if (icon?.mac) {
        config.mac.icon = icon.mac;
    }

    if (publish) {
        config.publish = publish;
    }

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

    const electronBin = localBinPath(baseDir, "electron");

    electronProc = spawnWithPipes(electronBin, ["electron-dist/main.cjs"], {
        cwd: baseDir,
        env: electronEnv,
        stdio: "inherit"
    });

    await new Promise((resolve) => {
        electronProc.on("exit", resolve);
    });

    cleanup();
}

function runBuild(client, target, shouldPublish, bump) {
    const root = getRootDir();
    const baseDir = path.join(root, "cht-base");
    const resolved = resolveClient(client);
    const runtimeConfig = buildRuntimeConfig({
        root,
        resolved,
        isDev: false,
        packaged: true
    });
    const entry = resolved.isDev ? null : loadClientConfig(resolved.name);

    if (bump?.shouldBump) {
        applyVersionBump(root, resolved, bump.bumpRepo);
    }

    const appVersion =
        resolveClientVersion(resolved) || readAppVersion(root) || DEFAULT_APP_VERSION;
    const publish = resolvePublish(entry);
    const icon = resolveAppIcon(root, resolved);

    console.log(`[electron] Building frontend for "${resolved.name}"...`);

    syncTsconfig({ client: client === "dev" ? "dev" : client });

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

    const backendAbsDir =
        resolved.backend && resolved.backend.packageWithElectron
            ? path.join(root, resolved.backend.dir)
            : null;

    if (backendAbsDir && !fs.existsSync(backendAbsDir)) {
        throw new Error(`[electron] Backend directory not found: ${backendAbsDir}`);
    }

    const { configPath, outDir } = writeBuilderConfig({
        root,
        baseDir,
        resolved,
        extraResources: prepareDesktopResources(
            root,
            baseDir,
            backendAbsDir,
            target,
            resolveTrayIcon(root, resolved)
        ),
        appVersion,
        publish,
        icon
    });

    console.log(`[electron] App version: ${appVersion}`);
    console.log(`[electron] Package target: ${target}`);
    console.log(
        `[electron] Update feed: ${publish ? `${publish[0].owner}/${publish[0].repo}` : "(none)"}`
    );

    const targetIcon = icon?.[target] ?? null;

    if (targetIcon) {
        console.log(`[electron] Icon: ${path.relative(root, targetIcon)}`);
    } else {
        console.warn(
            `[electron] No installer icon for "${target}". Add ${resolved.frontend.clientDir}/build/icon.ico (win) or icon.png (linux/mac).`
        );
    }

    if (target === "win" && process.platform !== "win32") {
        console.warn(
            "[electron] Cross-building for Windows: native backend addons must target win32-x64."
        );
    }

    const builderArgs = ["electron-builder", "--config", configPath, `--${target}`];

    if (shouldPublish) {
        builderArgs.push("--publish", "always");
    }

    console.log("[electron] Packaging desktop app...");
    run("npx", builderArgs, baseDir);
    console.log(`[electron] Desktop artifacts at ${path.relative(root, outDir)}`);
}

async function main() {
    const argv = process.argv.slice(2);

    if (argv.includes("-h") || argv.includes("--help")) {
        printUsage();
        process.exit(0);
    }

    const { isBuild, client, target, shouldPublish, shouldBump, bumpRepo } = parseArgs(argv);

    if (!client) {
        printUsage();
        process.exit(1);
    }

    assertKnownClient(client);

    if (isBuild) {
        runBuild(client, target, shouldPublish, { shouldBump, bumpRepo });
        return;
    }

    await runDev(client);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
