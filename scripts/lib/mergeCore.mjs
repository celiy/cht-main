import fs from "node:fs";
import path from "node:path";
import { CORE_WORKSPACE_REPOS } from "./version.mjs";
import { assertClean, checkoutBranch, git } from "./bumpCore.mjs";

const DEFAULT_SOURCE_BRANCH = "beta";
const DEFAULT_TARGET_BRANCH = "main";

/** Core siblings first, orchestrator last (same order as bump-core). */
const MERGE_REPO_DIRS = [
    ...CORE_WORKSPACE_REPOS.map((repo) => ({ repo, subdir: repo })),
    { repo: "cht-main", subdir: "." }
];

/**
 * Throws when `git` failed.
 * @param {string} cwd
 * @param {string[]} args
 * @param {string} label
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
 * @param {string} dir
 * @param {string} ref
 * @returns {boolean}
 */
function refExists(dir, ref) {
    return git(dir, ["rev-parse", "--verify", "--quiet", ref]).ok;
}

/**
 * Check if `ancestor` is an ancestor of `head`.
 * @param {string} dir
 * @param {string} ancestor
 * @param {string} head
 * @returns {boolean}
 */
function isAncestor(dir, ancestor, head) {
    return git(dir, ["merge-base", "--is-ancestor", ancestor, head]).ok;
}

/**
 * Merge `origin/source` into the current branch in `dir`.
 *
 * @param {string} dir
 * @param {string} sourceBranch
 * @param {string} targetBranch
 * @param {{ dryRun?: boolean, push?: boolean, fetch?: boolean }} options
 * @returns {{ repo: string, merged: boolean, pushed: boolean, skipped: boolean }}
 */
export function mergeBranchInRepo(dir, repoLabel, sourceBranch, targetBranch, options = {}) {
    const dryRun = Boolean(options.dryRun);
    const doPush = options.push !== false && !dryRun;
    const doFetch = options.fetch !== false;
    const remoteSource = `origin/${sourceBranch}`;
    const label = repoLabel;

    if (doFetch) {
        gitOrThrow(dir, ["fetch", "--prune", "origin"], `git fetch in ${label}`);
    }

    if (!refExists(dir, remoteSource)) {
        throw new Error(`${label}: missing ${remoteSource} (fetch origin/${sourceBranch} first).`);
    }

    checkoutBranch(dir, targetBranch, { fetch: false });

    if (refExists(dir, `origin/${targetBranch}`)) {
        gitOrThrow(
            dir,
            ["pull", "--ff-only", "origin", targetBranch],
            `git pull origin ${targetBranch} in ${label}`
        );
    }

    const head = git(dir, ["rev-parse", "HEAD"]).stdout;

    if (isAncestor(dir, remoteSource, head)) {
        return { repo: label, merged: false, pushed: false, skipped: true };
    }

    const mergeMessage = `Merge branch '${sourceBranch}' into ${targetBranch}`;

    if (dryRun) {
        const trial = git(dir, ["merge", "--no-commit", "--no-ff", remoteSource]);

        if (!trial.ok) {
            git(dir, ["merge", "--abort"]);

            throw new Error(`${label}: merge would fail:\n${trial.stderr || trial.stdout}`);
        }

        git(dir, ["merge", "--abort"]);

        return { repo: label, merged: true, pushed: false, skipped: false };
    }

    gitOrThrow(
        dir,
        ["merge", "--no-ff", remoteSource, "-m", mergeMessage],
        `git merge ${remoteSource} in ${label}`
    );

    let pushed = false;

    if (doPush) {
        gitOrThrow(
            dir,
            ["push", "origin", targetBranch],
            `git push origin ${targetBranch} in ${label}`
        );
        pushed = true;
    }

    return { repo: label, merged: true, pushed, skipped: false };
}

/**
 * Merge source → target across cht-shared, cht-base, cht-design-system and cht-main.
 *
 * @param {string} root Workspace root (cht-main)
 * @param {{
 *   sourceBranch?: string,
 *   targetBranch?: string,
 *   dryRun?: boolean,
 *   push?: boolean,
 *   fetch?: boolean
 * }} [options]
 */
export function mergeCoreBranches(root, options = {}) {
    const sourceBranch =
        String(options.sourceBranch ?? DEFAULT_SOURCE_BRANCH).trim() || DEFAULT_SOURCE_BRANCH;
    const targetBranch =
        String(options.targetBranch ?? DEFAULT_TARGET_BRANCH).trim() || DEFAULT_TARGET_BRANCH;
    const dryRun = Boolean(options.dryRun);
    const results = [];

    for (const { repo, subdir } of MERGE_REPO_DIRS) {
        const dir = path.join(root, subdir);

        if (!fs.existsSync(path.join(dir, ".git"))) {
            throw new Error(`${repo} is not a git repo (${dir}). Run install or clone first.`);
        }

        if (!dryRun) {
            assertClean(dir, repo);
        }

        const outcome = mergeBranchInRepo(dir, repo, sourceBranch, targetBranch, {
            dryRun,
            push: options.push,
            fetch: options.fetch
        });

        results.push(outcome);
    }

    return {
        sourceBranch,
        targetBranch,
        dryRun,
        results
    };
}
