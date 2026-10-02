#!/usr/bin/env node
import { getRootDir } from "./lib/clients.mjs";
import { bumpCoreAndPush } from "./lib/bumpCore.mjs";

function printUsage() {
    console.log("Bump cht-shared, cht-base and cht-design-system, then sync pins in cht-main.");
    console.log("Commits the bump on each repo and pushes to the given branch (default: main).");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain bump-core [branch] [--dry-run] [--all]");
    console.log("");
    console.log("--all also commits non-version changes in each repo (and cht-main).");
    console.log("");
    console.log("Examples:");
    console.log("  npx chtmain bump-core");
    console.log("  npx chtmain bump-core --all");
    console.log("  npx chtmain bump-core --dry-run");
}

function main() {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes("--dry-run");
    const includeAll = argv.includes("--all");
    const wantsHelp = argv.includes("-h") || argv.includes("--help");
    const branch = argv.find((arg) => !!arg && !arg.startsWith("-")) || "main";

    if (wantsHelp) {
        printUsage();
        process.exit(0);
    }

    let result;

    try {
        result = bumpCoreAndPush(getRootDir(), {
            branch,
            dryRun,
            push: !dryRun,
            all: includeAll
        });
    } catch (error) {
        console.error(`[bump-core] ${error.message}`);
        process.exit(1);
    }

    for (const bump of result.bumps) {
        const note = dryRun ? " (dry run)" : "";

        console.log(`[bump-core] ${bump.repo}: ${bump.from} -> ${bump.to}${note}`);
    }

    console.log(`[bump-core] cht-main pins <- ${JSON.stringify(result.pins)}`);
    console.log(`[bump-core] branch ${result.branch}${result.pushed ? " (pushed)" : ""}`);
}

main();
