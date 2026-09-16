#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getRootDir, getSharedRepos, listClientNames, parseClientFlag, resolveClient } from "./lib/clients.mjs";
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

    const result = spawnSync("git", ["pull"], { cwd: dir, stdio: "inherit" });

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

    const result = spawnSync("git", ["clone", url], { cwd, stdio: "inherit" });

    if (result.status !== 0) {
        console.warn(`[install] git clone failed for ${url} (continuing)`);
    }
}

/**
 * @param {string | null} client From `--client:<name>`; when set, only that client's repos are added beyond shared.
 */
function collectInstallRepoUrls(client) {
    const urls = new Set(getSharedRepos());

    if (client && client !== "dev") {
        const resolved = resolveClient(client);

        if (resolved.frontend?.repo) {
            urls.add(resolved.frontend.repo);
        }

        if (resolved.backend?.repo) {
            urls.add(resolved.backend.repo);
        }

        return [...urls];
    }

    for (const name of listClientNames()) {
        const resolved = resolveClient(name);

        if (resolved.frontend?.repo) {
            urls.add(resolved.frontend.repo);
        }

        if (resolved.backend?.repo) {
            urls.add(resolved.backend.repo);
        }
    }

    return [...urls];
}

function npmInstall(dir) {
    console.log(`[install] npm install in ${path.relative(getRootDir(), dir) || "."}`);

    const result = spawnSync("npm", ["install"], { cwd: dir, stdio: "inherit" });

    if (result.status !== 0) {
        throw new Error(`npm install failed in ${dir}`);
    }
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
