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
    "sync-deps": "sync-common-deps.mjs",
    "sync-tsconfig": "sync-tsconfig.mjs"
};

/** Accepted aliases so `npm run sync:deps` can forward its own name. */
const COMMAND_ALIASES = {
    "sync:deps": "sync-deps",
    "sync:tsconfig": "sync-tsconfig",
    "install:repos": "install"
};

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
    console.log("  dev            Start the dev runner (frontend + backend per client).");
    console.log("  build          Build a client frontend into builds/<client>/dist.");
    console.log("  electron       Open or package a client as a desktop app.");
    console.log("  sync-deps      Normalize shared dependency versions across repos.");
    console.log("  sync-tsconfig  Regenerate the @client/* tsconfig paths.");
    console.log("");
    console.log(`Available: ${commands.join(", ")}`);
}

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

function runDevRunner(args) {
    const runnerPath = path.join(SCRIPTS_DIR, "runner", "index.jsx");
    const result = spawnSync(process.execPath, ["--import", "tsx", runnerPath, ...args], {
        cwd: ROOT_DIR,
        stdio: "inherit",
        env: process.env
    });

    process.exit(result.status === null ? 1 : result.status);
}

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

    runNodeScript(scriptName, args);
}

main();
