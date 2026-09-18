#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertNodeOnPath, ensureNodeFromNvmrc } from "./lib/ensureNode.mjs";
import { spawnSyncInherit } from "./lib/runCommand.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS_DIR = path.join(ROOT_DIR, "scripts");

function printUsage() {
    console.log("Usage: node scripts/entry.mjs <install|dev|build|electron> [args...]");
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
    const command = process.argv[2];
    const args = process.argv.slice(3);

    if (!command || command === "-h" || command === "--help") {
        printUsage();
        process.exit(command ? 0 : 1);
    }

    if (!ensureNodeFromNvmrc(ROOT_DIR)) {
        process.exit(1);
    }

    if (!assertNodeOnPath()) {
        process.exit(1);
    }

    switch (command) {
        case "install":
            runNodeScript("install.mjs", args);
            break;
        case "dev":
            if (!ensureRootDevDependencies()) {
                process.exit(1);
            }

            runDevRunner(args);
            break;
        case "build":
            runNodeScript("build.mjs", args);
            break;
        case "electron":
            runNodeScript("electron.mjs", args);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            printUsage();
            process.exit(1);
    }
}

main();
