import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mergeBranchInRepo, mergeCoreBranches } from "./mergeCore.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

const gitEnv = {
    GIT_AUTHOR_NAME: "cht-check",
    GIT_AUTHOR_EMAIL: "check@cht.local",
    GIT_COMMITTER_NAME: "cht-check",
    GIT_COMMITTER_EMAIL: "check@cht.local"
};

function gitIn(dir, args) {
    return spawnSync("git", args, {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ...gitEnv }
    });
}

function gitInitBare(remoteDir) {
    fs.mkdirSync(remoteDir, { recursive: true });
    gitIn(remoteDir, ["init", "--bare", "-b", "main"]);
}

function gitInitWithRemote(workDir, remoteDir, defaultBranch = "main") {
    fs.mkdirSync(workDir, { recursive: true });
    gitIn(workDir, ["init", "-b", defaultBranch]);
    gitIn(workDir, ["config", "user.name", "cht-check"]);
    gitIn(workDir, ["config", "user.email", "check@cht.local"]);
    gitIn(workDir, ["remote", "add", "origin", remoteDir]);
}

function commitAll(dir, message, files) {
    for (const [name, body] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), body);
    }

    gitIn(dir, ["add", "-A"]);
    gitIn(dir, ["commit", "-m", message]);
    gitIn(dir, ["push", "-u", "origin", "HEAD"]);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cht-merge-core-"));
const remote = path.join(tmp, "remote.git");
const work = path.join(tmp, "work");

gitInitBare(remote);
gitInitWithRemote(work, remote);

commitAll(work, "main init", { readme: "main\n" });
gitIn(work, ["checkout", "-b", "beta"]);
commitAll(work, "beta change", { readme: "beta\n" });
gitIn(work, ["push", "-u", "origin", "beta"]);
gitIn(work, ["checkout", "main"]);

const merged = mergeBranchInRepo(work, "sample", "beta", "main", { push: true, fetch: true });

assert(merged.merged === true, "merge applies");
assert(gitIn(work, ["show", "-s", "--format=%s", "HEAD"]).stdout.includes("Merge branch"), "merge commit");

const skip = mergeBranchInRepo(work, "sample", "beta", "main", { push: false, fetch: true });

assert(skip.skipped === true, "second merge skips");

gitIn(work, ["checkout", "beta"]);
mergeBranchInRepo(work, "sample", "beta", "main", { push: false, fetch: true });
assert(gitIn(work, ["branch", "--show-current"]).stdout.trim() === "beta", "goes back to the original branch");

gitIn(work, ["checkout", "--detach"]);
mergeBranchInRepo(work, "sample", "beta", "main", { push: false, fetch: true });
assert(gitIn(work, ["branch", "--show-current"]).stdout.trim() === "", "detached HEAD is restored");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "cht-merge-core-root-"));

for (const repo of ["cht-shared", "cht-base", "cht-design-system"]) {
    const remoteRepo = path.join(root, `${repo}-remote.git`);
    const dir = path.join(root, repo);

    gitInitBare(remoteRepo);
    gitInitWithRemote(dir, remoteRepo);
    commitAll(dir, "init", { version: `version 1.0.0\n` });
    gitIn(dir, ["checkout", "-b", "beta"]);
    commitAll(dir, "beta", { version: `version 1.0.1\n` });
    gitIn(dir, ["push", "-u", "origin", "beta"]);
    gitIn(dir, ["checkout", "main"]);
}

const mainRemote = path.join(root, "main-remote.git");
const mainWork = root;

gitInitBare(mainRemote);
gitInitWithRemote(mainWork, mainRemote);
commitAll(mainWork, "init main", {
    ".gitignore": "/cht-*\n",
    version: "version 1.0.0\n"
});
gitIn(mainWork, ["checkout", "-b", "beta"]);
commitAll(mainWork, "beta main", { todo: "x\n" });
gitIn(mainWork, ["push", "-u", "origin", "beta"]);
gitIn(mainWork, ["checkout", "main"]);
gitIn(mainWork, ["push", "-u", "origin", "main"]);
gitIn(mainWork, ["push", "origin", "beta"]);

const batch = mergeCoreBranches(root, { sourceBranch: "beta", targetBranch: "main", push: true });

assert(batch.results.length === 4, "four repos");
assert(batch.results.every((item) => item.merged && !item.skipped), "all merged");

console.log("mergeCore.check.mjs: ok");
