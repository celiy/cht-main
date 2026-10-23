#!/usr/bin/env node
import { getRootDir } from "./lib/clients.mjs";
import { bumpCoreAndPush } from "./lib/bumpCore.mjs";

/**
 * Print the usage
 * @returns {void}
 */
function printUsage() {
    console.log("Bump cht-shared, cht-base and cht-design-system, then sync pins in cht-main.");
    console.log("Commits the bump on each repo and pushes on the branch each repo has checked out (or on the given branch).");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain bump-core [branch] [--only:<repos>] [--dry-run] [--all] [--manual-commit-message]");
    console.log("");
    console.log("Without [branch], nothing is checked out. With it, every repo switches to that branch first.");
    console.log("--all also commits non-version changes in each repo (and cht-main).");
    console.log("--manual-commit-message asks for a commit message per repo that has extra changes.");
    console.log("--only:<repos> bumps only the listed repos, comma separated (cht-shared, cht-base, cht-design-system).");
    console.log("");
    console.log("Examples:");
    console.log("  npx chtmain bump-core");
    console.log("  npx chtmain bump-core --all");
    console.log("  npx chtmain bump-core --manual-commit-message");
    console.log("  npx chtmain bump-core --dry-run");
    console.log("  npx chtmain bump-core --only:cht-base");
    console.log("  npx chtmain bump-core --only:cht-base,cht-design-system");
}

/**
 * Main function
 * @returns {Promise<void>}
 */
async function main() {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes("--dry-run");
    const includeAll = argv.includes("--all");
    const manualCommitMessage = argv.includes("--manual-commit-message");
    const wantsHelp = argv.includes("-h") || argv.includes("--help");
    const branch = argv.find((arg) => !!arg && !arg.startsWith("-")) || undefined;
    const onlyArg = argv.find((arg) => arg.startsWith("--only:"));
    const only = onlyArg?.slice("--only:".length).split(",").map((repo) => repo.trim());

    if (wantsHelp) {
        printUsage();
        process.exit(0);
    }

    let result;

    try {
        result = await bumpCoreAndPush(getRootDir(), {
            branch,
            dryRun,
            push: !dryRun,
            all: includeAll,
            manualCommitMessage,
            only
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

    for (const [repo, branch] of Object.entries(result.branches)) {
        console.log(`[bump-core] ${repo} branch ${branch}${result.pushed ? " (pushed)" : ""}`);
    }
}

main();
