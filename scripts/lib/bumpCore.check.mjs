import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    bumpCoreAndPush,
    coreBumpCommitMessage,
    extraChangePaths,
    git,
    mainPinsCommitMessage
} from "./bumpCore.mjs";
import { findVersionFile, parseVersionFileText, readVersion } from "./version.mjs";

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

function gitInit(dir, message, files) {
    fs.mkdirSync(dir, { recursive: true });

    for (const [name, body] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), body);
    }

    gitIn(dir, ["init", "-b", "main"]);
    gitIn(dir, ["config", "user.name", "cht-check"]);
    gitIn(dir, ["config", "user.email", "check@cht.local"]);
    gitIn(dir, ["add", "-A"]);
    gitIn(dir, ["commit", "-m", message]);
}

assert(coreBumpCommitMessage("1.0.1", "1.0.2") === "bump: 1.0.1 → 1.0.2", "core commit msg");
assert(
    mainPinsCommitMessage({
        "cht-shared": "1.0.2",
        "cht-base": "1.0.2",
        "cht-design-system": "1.0.2"
    }) === "bump: versões das repos principais (cht-shared 1.0.2, cht-base 1.0.2, cht-design-system 1.0.2)",
    "main commit msg"
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cht-bump-core-"));

gitInit(tmp, "init main", {
    ".gitignore": "/cht-*\n",
    version: "version 1.0.1\ncht-shared 1.0.1\ncht-base 1.0.1\ncht-design-system 1.0.1\n"
});
gitInit(path.join(tmp, "cht-shared"), "init shared", { version: "version 1.0.1\n" });
gitInit(path.join(tmp, "cht-base"), "init base", { version: "version 1.0.1\n" });
gitInit(path.join(tmp, "cht-design-system"), "init ds", { version: "version 1.0.1\n" });

const dry = await bumpCoreAndPush(tmp, { branch: "main", dryRun: true, fetch: false, push: false });

assert(dry.bumps.length === 3, "dry bumps three cores");
assert(dry.bumps.every((item) => item.to === "1.0.2" && !item.written), "dry does not write");
assert(readVersion(path.join(tmp, "cht-base")).version === "1.0.1", "dry leaves files");

const live = await bumpCoreAndPush(tmp, { branch: "main", fetch: false, push: false });

assert(live.pushed === false, "push skipped in check");
assert(readVersion(path.join(tmp, "cht-base")).version === "1.0.2", "base bumped");
assert(readVersion(path.join(tmp, "cht-shared")).version === "1.0.2", "shared bumped");
assert(readVersion(path.join(tmp, "cht-design-system")).version === "1.0.2", "ds bumped");

const pins = parseVersionFileText(fs.readFileSync(path.join(tmp, "version"), "utf8"));

assert(pins.version === "1.0.1", "cht-main own version not bumped");
assert(pins.requirements["cht-base"] === "1.0.2", "main pin follows local");
assert(pins.requirements["cht-shared"] === "1.0.2", "shared pin follows local");
assert(pins.requirements["cht-design-system"] === "1.0.2", "ds pin follows local");

const baseLog = git(path.join(tmp, "cht-base"), ["log", "-1", "--pretty=%s"]).stdout;

assert(baseLog === "bump: 1.0.1 → 1.0.2", "core repo commit");

const mainLog = git(tmp, ["log", "-1", "--pretty=%s"], gitEnv).stdout;

assert(
    mainLog === "bump: versões das repos principais (cht-shared 1.0.2, cht-base 1.0.2, cht-design-system 1.0.2)",
    "main pin commit"
);

const askedClean = [];

const cleanManual = await bumpCoreAndPush(tmp, {
    branch: "main",
    fetch: false,
    push: false,
    manualCommitMessage: true,
    askCommitMessage: (repo) => {
        askedClean.push(repo);

        return `should not prompt ${repo}`;
    }
});

assert(cleanManual.manualCommitMessage === true, "manual flag recorded");
assert(askedClean.length === 0, "clean repos do not prompt");
assert(
    git(path.join(tmp, "cht-base"), ["log", "-1", "--pretty=%s"]).stdout === "bump: 1.0.2 → 1.0.3",
    "clean manual keeps bump message"
);

fs.writeFileSync(path.join(tmp, "cht-base", "note.txt"), "dirty\n");
gitIn(path.join(tmp, "cht-base"), ["add", "note.txt"]);
gitIn(path.join(tmp, "cht-base"), ["commit", "-m", "add note"]);
fs.writeFileSync(path.join(tmp, "cht-base", "note.txt"), "changed\n");

assert(
    extraChangePaths(path.join(tmp, "cht-base"), findVersionFile(path.join(tmp, "cht-base"))).includes("note.txt"),
    "extraChangePaths sees note.txt"
);

let dirtyFailed = false;

try {
    await bumpCoreAndPush(tmp, { branch: "main", fetch: false, push: false });
} catch (error) {
    dirtyFailed = String(error.message).includes("dirty working tree");
}

assert(dirtyFailed, "dirty tree without --all fails");
assert(readVersion(path.join(tmp, "cht-base")).version === "1.0.3", "failed run did not bump");

const withAll = await bumpCoreAndPush(tmp, {
    branch: "main",
    fetch: false,
    push: false,
    all: true
});

assert(withAll.all === true, "all flag recorded");
assert(readVersion(path.join(tmp, "cht-base")).version === "1.0.4", "base bumped with --all");
assert(
    git(path.join(tmp, "cht-base"), ["log", "-1", "--pretty=%s"]).stdout === "bump: 1.0.3 → 1.0.4",
    "all without manual keeps bump message"
);

const allFiles = git(path.join(tmp, "cht-base"), ["show", "--name-only", "--pretty=", "HEAD"]).stdout;

assert(allFiles.includes("version"), "commit includes version");
assert(allFiles.includes("note.txt"), "commit includes extra files");

fs.writeFileSync(path.join(tmp, "cht-base", "note.txt"), "changed again\n");

let emptyFailed = false;

try {
    await bumpCoreAndPush(tmp, {
        branch: "main",
        fetch: false,
        push: false,
        manualCommitMessage: true,
        askCommitMessage: () => "   "
    });
} catch (error) {
    emptyFailed = String(error.message).includes("empty commit message");
}

assert(emptyFailed, "empty extra commit message fails");
assert(readVersion(path.join(tmp, "cht-base")).version === "1.0.4", "empty message did not bump");

const asked = [];

const withManual = await bumpCoreAndPush(tmp, {
    branch: "main",
    fetch: false,
    push: false,
    manualCommitMessage: true,
    askCommitMessage: (repo) => {
        asked.push(repo);

        return `feat: extra work in ${repo}`;
    }
});

assert(withManual.manualCommitMessage === true, "manual bump recorded");
assert(asked.join(",") === "cht-base", "only dirty extra repo is prompted");
assert(readVersion(path.join(tmp, "cht-base")).version === "1.0.5", "base bumped with --manual-commit-message");
assert(
    git(path.join(tmp, "cht-base"), ["log", "-1", "--pretty=%s"]).stdout === "feat: extra work in cht-base",
    "extra changes use prompted message"
);
assert(
    git(path.join(tmp, "cht-shared"), ["log", "-1", "--pretty=%s"]).stdout === "bump: 1.0.4 → 1.0.5",
    "clean core repo keeps bump message"
);

const baseFiles = git(path.join(tmp, "cht-base"), ["show", "--name-only", "--pretty=", "HEAD"]).stdout;

assert(baseFiles.includes("version"), "manual commit includes version");
assert(baseFiles.includes("note.txt"), "manual commit includes extra files");

fs.writeFileSync(path.join(tmp, "cht-base", "note.txt"), "changed once more\n");
fs.writeFileSync(path.join(tmp, "readme-extra.md"), "main extra\n");

const askedBoth = [];

const withAllManual = await bumpCoreAndPush(tmp, {
    branch: "main",
    fetch: false,
    push: false,
    all: true,
    manualCommitMessage: true,
    askCommitMessage: (repo) => {
        askedBoth.push(repo);

        return `chore: ${repo} extras`;
    }
});

assert(withAllManual.all === true, "all flag recorded");
assert(askedBoth.join(",") === "cht-base,cht-main", "each repo with extras is prompted");
assert(
    git(path.join(tmp, "cht-base"), ["log", "-1", "--pretty=%s"]).stdout === "chore: cht-base extras",
    "core extra message with --all"
);
assert(git(tmp, ["log", "-1", "--pretty=%s"]).stdout === "chore: cht-main extras", "cht-main extra message");
assert(
    git(tmp, ["show", "--name-only", "--pretty=", "HEAD"]).stdout.includes("readme-extra.md"),
    "cht-main extras are committed"
);

fs.rmSync(tmp, { recursive: true, force: true });

console.log("bumpCore.check.mjs ok");
