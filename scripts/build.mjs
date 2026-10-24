#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getRootDir, listClientNames, parsePositionalClientArg } from "./lib/clients.mjs";
import { spawnSyncInherit } from "./lib/runCommand.mjs";
import { withClientTsconfig } from "./mount-client-tsconfig.mjs";

/**
 * Print the usage
 * @returns {void}
 */
function printUsage() {
    const known = ["dev", ...listClientNames()].join(", ");

    console.log("Build/export frontend artifact for one client.");
    console.log("");
    console.log("Usage:");
    console.log("  npx chtmain build <client> [--out:<dir>]");
    console.log("  npm run build -- <client>");
    console.log("");
    console.log("  --out:<dir>  Export the artifact straight into <dir> (replaced on every build),");
    console.log("               relative to cht-main. Default: builds/<client>/dist.");
    console.log("");
    console.log(`Known clients: ${known || "(none)"}`);
}

/**
 * Run a command
 * @param {string} command The command to run.
 * @param {string[]} args The arguments to pass to the command.
 * @param {string} cwd The current working directory.
 * @param {Record<string, string>} extraEnv The extra environment variables.
 * @returns {void}
 */
function run(command, args, cwd, extraEnv = {}) {
    const result = spawnSyncInherit(command, args, { cwd, env: extraEnv });

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(" ")}`);
    }
}

/**
 * Copy a directory recursively
 * @param {string} src The source directory.
 * @param {string} dest The destination directory.
 * @returns {void}
 */
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        throw new Error(`Missing build output: ${src}`);
    }

    fs.mkdirSync(dest, { recursive: true });

    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
            continue;
        }

        fs.copyFileSync(srcPath, destPath);
    }
}

/**
 * Resolve the folder the artifact is exported to
 * @param {string} root The cht-main directory.
 * @param {string} client The client id.
 * @param {string[]} argv The command line arguments.
 * @returns {string} The absolute export folder.
 */
function resolveOutDist(root, client, argv) {
    const outArg = argv.find((arg) => arg.startsWith("--out:"));

    if (!outArg) {
        return path.join(root, "builds", client, "dist");
    }

    const value = outArg.slice("--out:".length).trim();

    if (!value) {
        console.error("[build] --out needs a folder: --out:<dir>");
        process.exit(2);
    }

    const outDist = path.resolve(root, value);

    // The folder is wiped before the copy, so it must never contain the workspace or the home.
    const relativeRoot = path.relative(outDist, root);
    const holdsWorkspace = !relativeRoot.startsWith("..") && !path.isAbsolute(relativeRoot);

    if (holdsWorkspace || outDist === path.parse(outDist).root || outDist === os.homedir()) {
        console.error(`[build] Refusing --out:${value}, it would wipe ${outDist}.`);
        process.exit(2);
    }

    return outDist;
}

/**
 * Main function
 * @returns {Promise<void>}
 */
function main() {
    const root = getRootDir();
    const baseDir = path.join(root, "cht-base");
    const client = parsePositionalClientArg(process.argv.slice(2));

    if (!client || client === "--help" || client === "-h") {
        printUsage();
        process.exit(client ? 0 : 1);
    }

    const known = ["dev", ...listClientNames()];

    if (!known.includes(client)) {
        console.error(`[build] Unknown client "${client}".`);
        printUsage();
        process.exit(2);
    }

    const outDist = resolveOutDist(root, client, process.argv.slice(2));

    console.log(`[build] Building client "${client}" in cht-base...`);

    withClientTsconfig(client === "dev" ? "dev" : client, () => {
        if (client === "dev") {
            run("npm", ["run", "build"], baseDir);
        } else {
            run("npm", ["run", "build:client"], baseDir, { CLIENT: client });
        }

        const distSrc = path.join(baseDir, "dist");
        fs.rmSync(outDist, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(outDist), { recursive: true });
        copyDirRecursive(distSrc, outDist);

        console.log(`[build] Exported artifact to ${path.relative(root, outDist)}`);
    });
}

main();
