#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
    clearClientDiscoveryCache,
    getCataloguedClient,
    getRootDir,
    getSharedRepos,
    listCataloguedClientNames,
    listClientNames,
    parseClientFlag,
    resolveClient
} from "./lib/clients.mjs";
import { spawnSyncInherit } from "./lib/runCommand.mjs";
import { syncTsconfig } from "./sync-tsconfig.mjs";

function repoNameFromUrl(url) {
    const last = url.split("/").pop() || "";

    return last.replace(/\.git$/, "");
}

function isGitRepo(dir) {
    return fs.existsSync(path.join(dir, ".git"));
}

function gitPull(dir, label) {
    console.log(`[install] git pull in ${label}`);

    const result = spawnSyncInherit("git", ["pull"], { cwd: dir });

    if (result.status !== 0) {
        console.warn(`[install] git pull failed in ${label} (continuing)`);
    }
}

function gitSyncFromUrl(url, cwd) {
    const name = repoNameFromUrl(url);
    const dest = path.join(cwd, name);

    if (fs.existsSync(dest)) {
        if (isGitRepo(dest)) {
            gitPull(dest, name);
        } else {
            console.warn(`[install] skip pull (not a git repo): ${name}`);
        }

        return;
    }

    console.log(`[install] git clone ${url}`);

    const result = spawnSyncInherit("git", ["clone", url], { cwd });

    if (result.status !== 0) {
        console.warn(`[install] git clone failed for ${url} (continuing)`);
    }
}

function addRepoUrl(urls, url) {
    if (typeof url === "string" && url.trim()) {
        urls.add(url.trim());
    }
}

/**
 * Collect frontend/backend clone URLs from local cht.config.json and the
 * clients.json catalog so `--client:<name>` works before the folder exists.
 *
 * @param {Set<string>} urls
 * @param {string} name
 */
function addClientRepoUrls(urls, name) {
    const catalog = getCataloguedClient(name);

    addRepoUrl(urls, catalog?.frontend?.repo);
    addRepoUrl(urls, catalog?.backend?.repo);

    try {
        const resolved = resolveClient(name);

        addRepoUrl(urls, resolved.frontend?.repo);
        addRepoUrl(urls, resolved.backend?.repo);
    } catch {
        // Config is missing until the frontend repo is cloned; catalog URLs are enough.
    }
}

/**
 * @param {string | null} client From `--client:<name>`; when set, only that client's repos are added beyond shared.
 */
function collectInstallRepoUrls(client) {
    const urls = new Set(getSharedRepos());

    if (client && client !== "dev") {
        addClientRepoUrls(urls, client);

        return [...urls];
    }

    const names = new Set([...listClientNames(), ...listCataloguedClientNames()]);

    for (const name of names) {
        addClientRepoUrls(urls, name);
    }

    return [...urls];
}

const NATIVE_ADDON_PACKAGES = ["better-sqlite3", "bcrypt"];

function packageJsonUsesNativeAddons(dir) {
    const pkgPath = path.join(dir, "package.json");

    if (!fs.existsSync(pkgPath)) {
        return false;
    }

    let pkg;

    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    } catch {
        return false;
    }

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    return NATIVE_ADDON_PACKAGES.some((name) => name in deps);
}

function npmRebuildNativeAddons(dir) {
    if (!packageJsonUsesNativeAddons(dir)) {
        return;
    }

    const label = path.relative(getRootDir(), dir) || ".";

    console.log(`[install] npm rebuild (native addons) in ${label}`);

    const result = spawnSyncInherit("npm", ["rebuild"], { cwd: dir });

    if (result.status !== 0) {
        throw new Error(`npm rebuild failed in ${dir}`);
    }
}

function npmInstall(dir) {
    console.log(`[install] npm install in ${path.relative(getRootDir(), dir) || "."}`);

    const result = spawnSyncInherit("npm", ["install"], { cwd: dir });

    if (result.status !== 0) {
        throw new Error(`npm install failed in ${dir}`);
    }

    npmRebuildNativeAddons(dir);
}

function listSubReposWithPackageJson(rootDir) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => path.join(rootDir, entry.name))
        .filter((dir) => fs.existsSync(path.join(dir, "package.json")));
}

function main() {
    const argv = process.argv.slice(2);
    const { client } = parseClientFlag(argv);
    const root = getRootDir();

    if (isGitRepo(root)) {
        gitPull(root, path.basename(root) || ".");
    }

    const repoUrls = collectInstallRepoUrls(client);

    for (const url of repoUrls) {
        gitSyncFromUrl(url, root);
    }

    clearClientDiscoveryCache();

    const afterCloneUrls = collectInstallRepoUrls(client);

    for (const url of afterCloneUrls) {
        gitSyncFromUrl(url, root);
    }

    syncTsconfig();

    if (fs.existsSync(path.join(root, "package.json"))) {
        npmInstall(root);
    }

    const subRepos = listSubReposWithPackageJson(root);

    for (const dir of subRepos) {
        npmInstall(dir);
    }

    console.log("[install] done.");
}

main();
