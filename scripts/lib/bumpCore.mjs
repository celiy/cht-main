import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    CORE_WORKSPACE_REPOS,
    bumpVersionDir,
    findVersionFile,
    readCoreLocalVersions,
    writeCoreVersionPins
} from "./version.mjs";

const DEFAULT_BRANCH = "main";

/**
 * Execute a git command
 * @param {string} cwd
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} [extraEnv]
 */
export function git(cwd, args, extraEnv = {}) {
    const result = spawnSync("git", args, {
        cwd,
        encoding: "utf8",
        env: { ...process.env, ...extraEnv }
    });

    return {
        ok: result.status === 0,
        status: result.status ?? 1,
        stdout: (result.stdout ?? "").trim(),
        stderr: (result.stderr ?? "").trim()
    };
}

/**
 * Execute a git command and throw an error if it fails
 * @param {string} cwd
 * @param {string[]} args
 * @param {string} label
 * @returns {Object} The result of the git command.
 */
function gitOrThrow(cwd, args, label) {
    const result = git(cwd, args);

    if (!result.ok) {
        const detail = result.stderr || result.stdout || `status ${result.status}`;

        throw new Error(`${label}: ${detail}`);
    }

    return result;
}

/**
 * Assert that a directory is clean
 * @param {string} dir
 * @param {string} label
 * @returns {void}
 */
function assertClean(dir, label) {
    const unstaged = git(dir, ["diff", "--quiet"]);
    const staged = git(dir, ["diff", "--cached", "--quiet"]);

    if (!unstaged.ok || !staged.ok) {
        const dirty = git(dir, ["status", "--porcelain", "-uno"]).stdout;

        throw new Error(`${label} has a dirty working tree:\n${dirty || "tracked files differ"}`);
    }
}

/**
 * Checkout a branch
 * @param {string} dir
 * @param {string} branch
 * @param {{ fetch?: boolean }} [options]
 */
export function checkoutBranch(dir, branch, options = {}) {
    if (options.fetch !== false) {
        git(dir, ["fetch", "--prune"]);
    }

    const current = git(dir, ["branch", "--show-current"]).stdout;

    if (current === branch) {
        return;
    }

    const local = git(dir, ["rev-parse", "--verify", "--quiet", branch]);

    if (local.ok) {
        gitOrThrow(dir, ["checkout", branch], `git checkout ${branch} in ${dir}`);

        return;
    }

    const remote = git(dir, ["rev-parse", "--verify", "--quiet", `origin/${branch}`]);

    if (remote.ok) {
        gitOrThrow(
            dir,
            ["checkout", "-B", branch, `origin/${branch}`],
            `git checkout ${branch} in ${dir}`
        );

        return;
    }

    throw new Error(`Branch "${branch}" not found in ${dir} (local or origin).`);
}

/**
 * Commit changes
 * @param {string} dir
 * @param {string} message
 * @param {Object} options
 * @returns {void}
 */
function commitChanges(dir, message, options = {}) {
    if (options.all) {
        gitOrThrow(dir, ["add", "-A"], `git add -A in ${dir}`);
    } else if (options.filePath) {
        const relative = path.relative(dir, options.filePath) || path.basename(options.filePath);

        gitOrThrow(dir, ["add", "--", relative], `git add ${relative} in ${dir}`);
    }

    gitOrThrow(dir, ["commit", "-m", message], `git commit in ${dir}`);
}

/**
 * Push a branch
 * @param {string} dir
 * @param {string} branch
 * @returns {void}
 */
function pushBranch(dir, branch) {
    gitOrThrow(dir, ["push", "-u", "origin", branch], `git push origin ${branch} in ${dir}`);
}

/**
 * Get the core bump commit message
 * @param {string} from
 * @param {string} to
 * @returns {string} The core bump commit message.
 */
export function coreBumpCommitMessage(from, to) {
    return `bump: ${from} → ${to}`;
}

/**
 * Get the main pins commit message
 * @param {Object} pins
 * @returns {string} The main pins commit message.
 */
export function mainPinsCommitMessage(pins) {
    const parts = CORE_WORKSPACE_REPOS.map((repo) => `${repo} ${pins[repo]}`).join(", ");

    return `bump: versões das repos principais (${parts})`;
}

/**
 * Bump core repos, rewrite cht-main pins from those local versions, commit, push.
 *
 * @param {string} root
 * @param {{ branch?: string, dryRun?: boolean, fetch?: boolean, push?: boolean, all?: boolean }} [options]
 */
export function bumpCoreAndPush(root, options = {}) {
    const branch = String(options.branch ?? DEFAULT_BRANCH).trim() || DEFAULT_BRANCH;
    const dryRun = Boolean(options.dryRun);
    const includeAll = Boolean(options.all);
    const doFetch = options.fetch !== false && !dryRun;
    const doPush = options.push !== false && !dryRun;
    const dirs = CORE_WORKSPACE_REPOS.map((repo) => ({
        repo,
        dir: path.join(root, repo)
    }));

    for (const { repo, dir } of dirs) {
        if (!fs.existsSync(path.join(dir, ".git"))) {
            throw new Error(`${repo} is not a git repo (${dir}).`);
        }
    }

    if (!fs.existsSync(path.join(root, ".git"))) {
        throw new Error(`cht-main is not a git repo (${root}).`);
    }

    if (!dryRun && !includeAll) {
        for (const { repo, dir } of dirs) {
            assertClean(dir, repo);
        }

        assertClean(root, "cht-main");
    }

    if (!dryRun) {
        for (const { dir } of dirs) {
            checkoutBranch(dir, branch, { fetch: doFetch });
        }

        checkoutBranch(root, branch, { fetch: doFetch });
    }

    const bumps = [];

    for (const { repo, dir } of dirs) {
        const result = bumpVersionDir(dir, { dryRun });

        bumps.push({ repo, ...result });

        if (!dryRun) {
            commitChanges(dir, coreBumpCommitMessage(result.from, result.to), {
                all: includeAll,
                filePath: result.filePath
            });
        }
    }

    const pins = dryRun
        ? Object.fromEntries(bumps.map((item) => [item.repo, item.to]))
        : readCoreLocalVersions(root);

    const pinResult = writeCoreVersionPins(root, pins, { dryRun });

    if (!dryRun && (pinResult.changed || includeAll)) {
        const filePath = pinResult.filePath || findVersionFile(root);

        commitChanges(root, mainPinsCommitMessage(pins), {
            all: includeAll,
            filePath
        });
    }

    if (doPush) {
        for (const { dir } of dirs) {
            pushBranch(dir, branch);
        }

        pushBranch(root, branch);
    }

    return { branch, dryRun, pushed: doPush, all: includeAll, bumps, pins };
}
