#!/usr/bin/env node
import { getRootDir } from "./lib/clients.mjs";
import { mergeCoreBranches } from "./lib/mergeCore.mjs";

/**
 * Print the usage
 * @returns {void}
 */
function printUsage() {
    console.log("Merge a source branch into a target branch on core workspace repos.");
    console.log("");
    console.log("Repos (in order): cht-shared, cht-base, cht-design-system, cht-main.");
    console.log("Requires a clean working tree in each repo (unless --dry-run).");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain merge-core [source] [target] [--dry-run] [--no-push]");
    console.log("");
    console.log("Defaults: source beta, target main.");
    console.log("");
    console.log("Examples:");
    console.log("  npx chtmain merge-core");
    console.log("  npx chtmain merge-core --dry-run");
    console.log("  npx chtmain merge-core beta main --no-push");
}

/**
 * Main function
 * @returns {void}
 */
function main() {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes("--dry-run");
    const noPush = argv.includes("--no-push");
    const wantsHelp = argv.includes("-h") || argv.includes("--help");

    if (wantsHelp) {
        printUsage();
        process.exit(0);
    }

    const positionals = argv.filter((arg) => !!arg && !arg.startsWith("-"));
    const sourceBranch = positionals[0] ?? "beta";
    const targetBranch = positionals[1] ?? "main";

    let result;

    try {
        result = mergeCoreBranches(getRootDir(), {
            sourceBranch,
            targetBranch,
            dryRun,
            push: !noPush
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.error(`[merge-core] ${message}`);
        process.exit(1);
    }

    for (const item of result.results) {
        const suffix = result.dryRun ? " (dry run)" : "";

        if (item.skipped) {
            console.log(`[merge-core] ${item.repo}: already up to date with origin/${result.sourceBranch}${suffix}`);
            continue;
        }

        const pushNote = item.pushed ? ", pushed" : result.dryRun ? "" : ", not pushed";

        console.log(
            `[merge-core] ${item.repo}: merged origin/${result.sourceBranch} → ${result.targetBranch}${pushNote}${suffix}`
        );
    }

    console.log(
        `[merge-core] done (${result.sourceBranch} → ${result.targetBranch})${result.dryRun ? " (dry run)" : ""}`
    );
}

main();
