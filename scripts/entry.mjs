#!/usr/bin/env node
/**
 * Single entry point for every workspace task.
 *
 * Each command delegates to a script in `scripts/`, so the same invocation
 * works on Windows and Linux without per-OS wrappers:
 *
 *   npx chtmain <command> [args...]
 *   npm run cht -- <command> [args...]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertNodeOnPath, ensureNodeFromNvmrc } from "./lib/ensureNode.mjs";
import { spawnSyncInherit } from "./lib/runCommand.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS_DIR = path.join(ROOT_DIR, "scripts");

/**
 * Commands reaching an `.mjs` script in `scripts/`. The `dev` command is
 * handled separately because it boots the Ink runner through tsx.
 */
const SCRIPT_COMMANDS = {
    install: "install.mjs",
    build: "build.mjs",
    electron: "electron.mjs",
    bump: "bump.mjs",
    "bump-core": "bump-core.mjs",
    "merge-core": "merge-core.mjs",
    create: "create.mjs",
    "sync-deps": "sync-common-deps.mjs"
};

/** Accepted aliases so `npm run sync:deps` can forward its own name. */
const COMMAND_ALIASES = {
    "sync:deps": "sync-deps",
    "install:repos": "install",
    "version:bump": "bump"
};

/**
 * Print the usage
 * @returns {void}
 */
function printUsage() {
    const commands = [...Object.keys(SCRIPT_COMMANDS), "dev"];

    console.log("Workspace task runner.");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain <command> [args...]");
    console.log("  npm run cht -- <command> [args...]");
    console.log("");
    console.log("Commands:");
    console.log("  install        Clone/pull workspace repos and install dependencies.");
    console.log("                   --skip-git  --force-git  --skip-npm-install  --client:<name>");
    console.log("                   --new  --workspace:<name>  --workspace-clean");
    console.log("  dev            Start the dev runner (frontend + backend per client).");
    console.log("                   --no-backend  --client:<name>");
    console.log("  build          Build a client frontend into builds/<client>/dist.");
    console.log("  electron       Open or package a client as a desktop app.");
    console.log("  create         Scaffold a client frontend from the cht-base template.");
    console.log("  bump           Bump the version file of one workspace repo.");
    console.log("  bump-core      Bump core repos, sync cht-main pins, commit and push.");
    console.log("                   [branch]  --dry-run  --all  --manual-commit-message");
    console.log("  merge-core     Merge source branch into target on core repos (+ cht-main).");
    console.log("                   [source] [target]  --dry-run  --no-push  (default beta → main)");
    console.log("  sync-deps      Normalize shared dependency versions across repos.");
    console.log("");
    console.log(`Available: ${commands.join(", ")}`);
}

/**
 * Ensure the root dev dependencies
 * @returns {boolean} Whether the root dev dependencies are ensured.
 */
function ensureRootDevDependencies() {
    const tsxDir = path.join(ROOT_DIR, "node_modules", "tsx");

    if (fs.existsSync(tsxDir)) {
        return true;
    }

    console.error("Installing root dev dependencies (first run)...");

    const result = spawnSyncInherit("npm", ["install", "--silent"], { cwd: ROOT_DIR });

    if (result.status !== 0) {
        console.error("Error: failed to install root dependencies.");

        return false;
    }

    return true;
}

/**
 * Run a node script
 * @param {string} scriptName File name inside `scripts/`.
 * @param {string[]} args Arguments forwarded to the script.
 * @returns {never} Exits with the child status.
 */
function runNodeScript(scriptName, args) {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const result = spawnSync(process.execPath, [scriptPath, ...args], {
        cwd: ROOT_DIR,
        stdio: "inherit",
        env: process.env
    });

    process.exit(result.status === null ? 1 : result.status);
}

/**
 * Run the dev runner
 * @param {string[]} args The arguments.
 * @returns {void}
 */
function runDevRunner(args) {
    const runnerPath = path.join(SCRIPTS_DIR, "runner", "index.jsx");
    const result = spawnSync(process.execPath, ["--import", "tsx", runnerPath, ...args], {
        cwd: ROOT_DIR,
        stdio: "inherit",
        env: process.env
    });

    process.exit(result.status === null ? 1 : result.status);
}

/**
 * Main function
 * @returns {void}
 */
function main() {
    const rawCommand = process.argv[2];
    const args = process.argv.slice(3);

    if (!rawCommand || rawCommand === "-h" || rawCommand === "--help" || rawCommand === "help") {
        printUsage();
        process.exit(rawCommand ? 0 : 1);
    }

    const command = COMMAND_ALIASES[rawCommand] || rawCommand;

    if (command === "dev") {
        if (!ensureNodeFromNvmrc(ROOT_DIR) || !assertNodeOnPath()) {
            process.exit(1);
        }

        if (!ensureRootDevDependencies()) {
            process.exit(1);
        }

        runDevRunner(args);
    }

    const scriptName = SCRIPT_COMMANDS[command];

    if (!scriptName) {
        console.error(`Unknown command: ${rawCommand}`);
        printUsage();
        process.exit(1);
    }

    if (!ensureNodeFromNvmrc(ROOT_DIR) || !assertNodeOnPath()) {
        process.exit(1);
    }

    if (command === "install" && args.includes("--new") && !ensureRootDevDependencies()) {
        process.exit(1);
    }

    runNodeScript(scriptName, args);
}

main();
