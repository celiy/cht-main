#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getRootDir, listClientNames, parsePositionalClientArg } from "./lib/clients.mjs";

function printUsage() {
    const known = ["dev", ...listClientNames()].join(", ");

    console.log("Build/export frontend artifact for one client.");
    console.log("");
    console.log("Usage:");
    console.log("  npm run build -- <client>");
    console.log("  ./build.sh <client>");
    console.log("");
    console.log(`Known clients: ${known || "(none)"}`);
}

function run(command, args, cwd, extraEnv = {}) {
    const result = spawnSync(command, args, {
        cwd,
        stdio: "inherit",
        env: { ...process.env, ...extraEnv }
    });

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(" ")}`);
    }
}

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

    const basePkg = JSON.parse(fs.readFileSync(path.join(baseDir, "package.json"), "utf8"));
    const scripts = basePkg?.scripts || {};
    const namedBuildScript = `build:${client}`;

    console.log(`[build] Building client "${client}" in cht-base...`);

    if (client === "dev") {
        run("npm", ["run", "build"], baseDir);
    } else if (scripts[namedBuildScript]) {
        run("npm", ["run", namedBuildScript], baseDir);
    } else {
        run("npm", ["run", "build"], baseDir, { CLIENT: client });
    }

    const distSrc = path.join(baseDir, "dist");
    const outRoot = path.join(root, "builds", client);
    const outDist = path.join(outRoot, "dist");

    fs.rmSync(outDist, { recursive: true, force: true });
    fs.mkdirSync(outRoot, { recursive: true });
    copyDirRecursive(distSrc, outDist);

    console.log(`[build] Exported artifact to ${path.relative(root, outDist)}`);
}

main();
