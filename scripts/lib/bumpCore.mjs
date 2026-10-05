import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
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
        stdout: (result.stdout ?? "").replace(/[\r\n]+$/, ""),
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
 * Paths in `git status --porcelain` other than the version file.
 *
 * @param {string} dir
 * @param {string} versionFilePath
 * @returns {string[]}
 */
export function extraChangePaths(dir, versionFilePath) {
    const versionRel = path.relative(dir, versionFilePath).split(path.sep).join("/");
    const stdout = git(dir, ["status", "--porcelain"]).stdout;

    if (!stdout) {
        return [];
    }

    const extras = [];

    for (const line of stdout.split("\n")) {
        if (!line) {
            continue;
        }

        let entry = line.slice(3);

        if (entry.includes(" -> ")) {
            entry = entry.slice(entry.lastIndexOf(" -> ") + 4);
        }

        if (entry.startsWith("\"") && entry.endsWith("\"")) {
            entry = entry.slice(1, -1);
        }

        const normalized = entry.split(path.sep).join("/");

        if (normalized !== versionRel) {
            extras.push(normalized);
        }
    }

    return extras;
}

/**
 * Ask for a commit message on stdout/stdin.
 *
 * @param {string} repo
 * @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream }} [io]
 * @returns {Promise<string>}
 */
export async function promptCommitMessage(repo, io = {}) {
    const rl = readline.createInterface({
        input: io.input ?? process.stdin,
        output: io.output ?? process.stdout
    });

    try {
        return String(
            await rl.question(
                `[bump-core] ${repo} tem alterações além da versão. Mensagem de commit: `
            )
        ).trim();
    } finally {
        rl.close();
    }
}

/**
 * @param {string} repo
 * @param {string[]} extras
 * @param {(repo: string, extras: string[]) => string | Promise<string>} ask
 * @returns {Promise<string>}
 */
async function askedCommitMessage(repo, extras, ask) {
    const message = String((await ask(repo, extras)) ?? "").trim();

    if (!message) {
        throw new Error(`${repo}: empty commit message`);
    }

    return message;
}

/**
 * Prompt once per repo that has extra files, before any bump is written.
 *
 * @param {{ repo: string, dir: string }[]} dirs
 * @param {string} root
 * @param {{ dryRun?: boolean, manualCommitMessage?: boolean, askCommitMessage?: Function }} options
 * @returns {Promise<Record<string, string>>}
 */
async function extraCommitMessages(dirs, root, options) {
    const messages = {};

    if (!options.manualCommitMessage || options.dryRun) {
        return messages;
    }

    const ask = options.askCommitMessage ?? promptCommitMessage;
    const targets = [...dirs, { repo: "cht-main", dir: root }];

    for (const { repo, dir } of targets) {
        const versionFile = findVersionFile(dir);

        if (!versionFile) {
            continue;
        }

        const extras = extraChangePaths(dir, versionFile);

        if (extras.length === 0) {
            continue;
        }

        messages[repo] = await askedCommitMessage(repo, extras, ask);
    }

    return messages;
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
 * @param {{
 *   branch?: string,
 *   dryRun?: boolean,
 *   fetch?: boolean,
 *   push?: boolean,
 *   all?: boolean,
 *   manualCommitMessage?: boolean,
 *   askCommitMessage?: (repo: string, extras: string[]) => string | Promise<string>
 * }} [options]
 */
export async function bumpCoreAndPush(root, options = {}) {
    const branch = String(options.branch ?? DEFAULT_BRANCH).trim() || DEFAULT_BRANCH;
    const dryRun = Boolean(options.dryRun);
    const includeAll = Boolean(options.all);
    const manualCommitMessage = Boolean(options.manualCommitMessage);
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

    if (!dryRun && !includeAll && !manualCommitMessage) {
        for (const { repo, dir } of dirs) {
            assertClean(dir, repo);
        }

        assertClean(root, "cht-main");
    }

    const extraMessages = await extraCommitMessages(dirs, root, {
        dryRun,
        manualCommitMessage,
        askCommitMessage: options.askCommitMessage
    });

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
            const extraMessage = extraMessages[repo];

            commitChanges(dir, extraMessage || coreBumpCommitMessage(result.from, result.to), {
                all: includeAll || Boolean(extraMessage),
                filePath: result.filePath
            });
        }
    }

    const pins = dryRun
        ? Object.fromEntries(bumps.map((item) => [item.repo, item.to]))
        : readCoreLocalVersions(root);

    const pinResult = writeCoreVersionPins(root, pins, { dryRun });
    const extraMainMessage = extraMessages["cht-main"];

    if (!dryRun && (pinResult.changed || includeAll || extraMainMessage)) {
        const filePath = pinResult.filePath || findVersionFile(root);

        commitChanges(root, extraMainMessage || mainPinsCommitMessage(pins), {
            all: includeAll || Boolean(extraMainMessage),
            filePath
        });
    }

    if (doPush) {
        for (const { dir } of dirs) {
            pushBranch(dir, branch);
        }

        pushBranch(root, branch);
    }

    return {
        branch,
        dryRun,
        pushed: doPush,
        all: includeAll,
        manualCommitMessage,
        bumps,
        pins
    };
}
