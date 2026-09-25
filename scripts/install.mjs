#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function repoNameFromUrl(url) {
    const last = url.split("/").pop() || "";

    return last.replace(/\.git$/, "");
}

function isGitRepo(dir) {
    return fs.existsSync(path.join(dir, ".git"));
}

function assertGitOk(result, message) {
    if (result.status !== 0) {
        throw new Error(message);
    }
}

function looksLikeCommitSha(ref) {
    return /^[0-9a-f]{7,40}$/i.test(ref);
}

/**
 * @param {string[]} argv
 * @returns {{
 *   client: string | null,
 *   skipGit: boolean,
 *   forceGit: boolean,
 *   skipNpmInstall: boolean
 * }}
 */
function parseInstallFlags(argv) {
    const { client, rest } = parseClientFlag(argv);
    let skipGit = false;
    let forceGit = false;
    let skipNpmInstall = false;
    const unknown = [];

    for (const arg of rest) {
        if (arg === "--skip-git") {
            skipGit = true;
        } else if (arg === "--force-git") {
            forceGit = true;
        } else if (arg === "--skip-npm-install") {
            skipNpmInstall = true;
        } else if (arg.startsWith("-")) {
            unknown.push(arg);
        }
    }

    if (unknown.length > 0) {
        throw new Error(
            `[install] Unknown flag(s): ${unknown.join(", ")}. ` +
                "Supported: --skip-git, --force-git, --skip-npm-install, --client:<name>"
        );
    }

    if (skipGit && forceGit) {
        throw new Error("[install] Use either --skip-git or --force-git, not both.");
    }

    return { client, skipGit, forceGit, skipNpmInstall };
}

/**
 * @param {string | { url?: string, repo?: string, ref?: string } | null | undefined} value
 * @param {string | null | undefined} extraRef
 * @returns {{ url: string, ref?: string } | null}
 */
function parseRepoSpec(value, extraRef) {
    const hint = typeof extraRef === "string" && extraRef.trim() ? extraRef.trim() : undefined;

    if (typeof value === "string" && value.trim()) {
        return { url: value.trim(), ref: hint };
    }

    if (!value || typeof value !== "object") {
        return null;
    }

    const urlCandidate = [value.url, value.repo].find(
        (entry) => typeof entry === "string" && entry.trim()
    );
    const url = urlCandidate ? urlCandidate.trim() : "";
    const ref =
        typeof value.ref === "string" && value.ref.trim() ? value.ref.trim() : hint;

    if (!url) {
        return null;
    }

    return { url, ref };
}

function addRepoSpec(list, spec) {
    if (!spec) {
        return;
    }

    const existing = list.find((item) => item.url === spec.url);

    if (existing) {
        if (!existing.ref && spec.ref) {
            existing.ref = spec.ref;
        }

        return;
    }

    list.push({ url: spec.url, ref: spec.ref });
}

/**
 * Discard local changes and match the tracking remote (or origin default).
 * @param {string} dir
 * @param {string} label
 */
function gitForceResetToRemote(dir, label) {
    console.log(`[install] git reset --hard to remote in ${label} (--force-git)`);

    const upstream = spawnSync(
        "git",
        ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
        { cwd: dir, encoding: "utf8" }
    );

    if (upstream.status === 0 && upstream.stdout.trim()) {
        assertGitOk(
            spawnSyncInherit("git", ["reset", "--hard", "@{u}"], { cwd: dir }),
            `git reset --hard @{u} failed in ${label}`
        );

        return;
    }

    const originHead = spawnSync(
        "git",
        ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"],
        { cwd: dir, encoding: "utf8" }
    );

    if (originHead.status === 0 && originHead.stdout.trim()) {
        const ref = originHead.stdout.trim();

        assertGitOk(
            spawnSyncInherit("git", ["reset", "--hard", ref], { cwd: dir }),
            `git reset --hard ${ref} failed in ${label}`
        );

        return;
    }

    throw new Error(
        `[install] --force-git: no upstream or origin/HEAD in ${label}; set upstream or pass a ref`
    );
}

/**
 * @param {string} dir
 * @param {string} label
 * @param {string} ref
 * @param {boolean} forceGit
 */
function gitCheckoutRef(dir, label, ref, forceGit) {
    console.log(`[install] git checkout ${ref} in ${label}`);

    const args = looksLikeCommitSha(ref) ? ["checkout", "--detach", ref] : ["checkout", ref];
    const result = spawnSyncInherit("git", args, { cwd: dir });

    assertGitOk(result, `git checkout ${ref} failed in ${label}`);

    if (looksLikeCommitSha(ref)) {
        return;
    }

    if (forceGit) {
        console.log(`[install] git fetch in ${label}`);
        assertGitOk(
            spawnSyncInherit("git", ["fetch", "--tags", "--prune"], { cwd: dir }),
            `git fetch failed in ${label}`
        );
        assertGitOk(
            spawnSyncInherit("git", ["reset", "--hard", `origin/${ref}`], { cwd: dir }),
            `git reset --hard origin/${ref} failed in ${label}`
        );

        return;
    }

    const pull = spawnSyncInherit("git", ["pull", "--ff-only"], { cwd: dir });

    if (pull.status !== 0) {
        console.log(`[install] git pull skipped after checkout in ${label} (tag or pinned ref)`);
    }
}

/**
 * @param {{ url: string, ref?: string }} spec
 * @param {string} cwd
 * @param {boolean} forceGit
 */
function gitSyncRepo(spec, cwd, forceGit) {
    const { url, ref } = spec;
    const name = repoNameFromUrl(url);
    const dest = path.join(cwd, name);

    if (fs.existsSync(dest)) {
        if (!isGitRepo(dest)) {
            throw new Error(`[install] ${name} exists but is not a git repo`);
        }

        console.log(`[install] git fetch in ${name}`);
        assertGitOk(
            spawnSyncInherit("git", ["fetch", "--tags", "--prune"], { cwd: dest }),
            `git fetch failed in ${name}`
        );

        if (ref) {
            gitCheckoutRef(dest, name, ref, forceGit);
        } else if (forceGit) {
            gitForceResetToRemote(dest, name);
        } else {
            console.log(`[install] git pull --ff-only in ${name}`);
            assertGitOk(
                spawnSyncInherit("git", ["pull", "--ff-only"], { cwd: dest }),
                `git pull failed in ${name}`
            );
        }

        return;
    }

    console.log(`[install] git clone ${url}`);
    assertGitOk(spawnSyncInherit("git", ["clone", url], { cwd }), `git clone failed for ${url}`);

    if (ref) {
        gitCheckoutRef(dest, name, ref, forceGit);
    }
}

/**
 * Collect frontend/backend clone specs from local cht.config.json and the
 * clients.json catalog so `--client:<name>` works before the folder exists.
 *
 * @param {{ url: string, ref?: string }[]} list
 * @param {string} name
 */
function addClientRepoSpecs(list, name) {
    const catalog = getCataloguedClient(name);

    addRepoSpec(list, parseRepoSpec(catalog?.frontend, catalog?.frontend?.ref));
    addRepoSpec(list, parseRepoSpec(catalog?.backend, catalog?.backend?.ref));

    try {
        const resolved = resolveClient(name);

        addRepoSpec(list, parseRepoSpec(resolved.frontend?.repo, resolved.frontend?.ref));
        addRepoSpec(list, parseRepoSpec(resolved.backend?.repo, resolved.backend?.ref));
    } catch {
        // Config is missing until the frontend repo is cloned; catalog URLs are enough.
    }
}

/**
 * @param {string | null} client From `--client:<name>`; when set, only that client's repos are added beyond shared.
 * @returns {{ url: string, ref?: string }[]}
 */
function collectInstallRepos(client) {
    const list = [];

    for (const entry of getSharedRepos()) {
        addRepoSpec(list, parseRepoSpec(entry));
    }

    if (client && client !== "dev") {
        addClientRepoSpecs(list, client);

        return list;
    }

    const names = new Set([...listClientNames(), ...listCataloguedClientNames()]);

    for (const name of names) {
        addClientRepoSpecs(list, name);
    }

    return list;
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

/**
 * @param {string} root
 * @param {boolean} forceGit
 */
function syncRootGit(root, forceGit) {
    if (!isGitRepo(root)) {
        return;
    }

    const label = path.basename(root) || ".";

    console.log(`[install] git fetch in ${label}`);
    assertGitOk(
        spawnSyncInherit("git", ["fetch", "--tags", "--prune"], { cwd: root }),
        `git fetch failed in ${label}`
    );

    if (forceGit) {
        gitForceResetToRemote(root, label);

        return;
    }

    console.log(`[install] git pull --ff-only in ${label}`);
    assertGitOk(
        spawnSyncInherit("git", ["pull", "--ff-only"], { cwd: root }),
        `git pull failed in ${label}`
    );
}

function main() {
    const { client, skipGit, forceGit, skipNpmInstall } = parseInstallFlags(process.argv.slice(2));
    const root = getRootDir();

    if (skipGit) {
        console.log("[install] skipping git (--skip-git)");
    } else {
        syncRootGit(root, forceGit);

        const repoSpecs = collectInstallRepos(client);

        for (const spec of repoSpecs) {
            gitSyncRepo(spec, root, forceGit);
        }

        clearClientDiscoveryCache();

        const afterCloneSpecs = collectInstallRepos(client);

        for (const spec of afterCloneSpecs) {
            gitSyncRepo(spec, root, forceGit);
        }
    }

    if (skipNpmInstall) {
        console.log("[install] skipping npm install (--skip-npm-install)");
    } else {
        if (fs.existsSync(path.join(root, "package.json"))) {
            npmInstall(root);
        }

        const subRepos = listSubReposWithPackageJson(root);

        for (const dir of subRepos) {
            npmInstall(dir);
        }
    }

    console.log("[install] done.");
}

main();
