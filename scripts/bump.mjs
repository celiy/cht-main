#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { getRootDir } from "./lib/clients.mjs";
import { bumpVersionDir, listBumpableRepos, readVersion, resolveRepoDir } from "./lib/version.mjs";

function printUsage() {
    const known = listBumpableRepos(getRootDir());

    console.log("Bump the version file of one workspace repo.");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain bump <repo> [--dry-run]");
    console.log("  npm run bump -- <repo>");
    console.log("");
    console.log("The repo name omits the `cht-` prefix, so `client-mecarvit`");
    console.log("targets `cht-client-mecarvit`. Use `main` for the workspace root.");
    console.log("");
    console.log("Rules: versions are `x.y.z`; minor and patch wrap at 10.");
    console.log("  1.1.1 -> 1.1.2   1.1.10 -> 1.2.0   5.10.10 -> 6.0.0");
    console.log("");
    console.log(`Bumpable repos: ${known.join(", ") || "(none)"}`);
}

function main() {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes("--dry-run");
    const wantsHelp = argv.includes("-h") || argv.includes("--help");
    const repo = argv.find((arg) => !!arg && !arg.startsWith("-"));

    if (wantsHelp) {
        printUsage();
        process.exit(0);
    }

    if (!repo) {
        printUsage();
        process.exit(1);
    }

    const root = getRootDir();
    const dir = resolveRepoDir(root, repo);

    if (!fs.existsSync(dir) || !readVersion(dir)) {
        console.error(`[bump] No version file for repo "${repo}" (looked in ${dir}).`);

        const known = listBumpableRepos(root);

        if (known.length > 0) {
            console.error(`[bump] Bumpable repos: ${known.join(", ")}`);
        }

        process.exit(2);
    }

    let result;

    try {
        result = bumpVersionDir(dir, { dryRun });
    } catch (error) {
        console.error(`[bump] ${error.message}`);
        process.exit(3);
    }

    const relative = path.relative(root, result.filePath) || result.filePath;

    if (dryRun) {
        console.log(`[bump] ${relative}: ${result.from} -> ${result.to} (dry run, not written)`);

        return;
    }

    console.log(`[bump] ${relative}: ${result.from} -> ${result.to}`);
    console.log("[bump] Version file updated. Commit it when you are ready.");
}

main();
