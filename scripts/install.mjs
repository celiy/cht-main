#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRootDir, getSharedRepos, parseClientFlag, resolveClient } from "./lib/clients.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function repoNameFromUrl(url) {
    const last = url.split("/").pop() || "";

    return last.replace(/\.git$/, "");
}

function gitClone(url, cwd) {
    const name = repoNameFromUrl(url);
    const dest = path.join(cwd, name);

    if (fs.existsSync(dest)) {
        console.log(`[install] skip clone (exists): ${name}`);

        return;
    }

    console.log(`[install] git clone ${url}`);

    const result = spawnSync("git", ["clone", url], { cwd, stdio: "inherit" });

    if (result.status !== 0) {
        console.warn(`[install] git clone failed for ${url} (continuing)`);
    }
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

    for (const url of getSharedRepos()) {
        gitClone(url, root);
    }

    if (client && client !== "dev") {
        const resolved = resolveClient(client);

        if (resolved.frontend.repo) {
            gitClone(resolved.frontend.repo, root);
        }

        if (resolved.backend && resolved.backend.repo) {
            gitClone(resolved.backend.repo, root);
        }
    }

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
