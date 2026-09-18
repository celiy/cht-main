import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function readNvmrcVersion(rootDir) {
    const nvmrcPath = path.join(rootDir, ".nvmrc");

    if (!fs.existsSync(nvmrcPath)) {
        return null;
    }

    const wanted = fs.readFileSync(nvmrcPath, "utf8").replace(/\s/g, "");

    return wanted || null;
}

function tryUnixNvm(wanted) {
    const nvmDir = process.env.NVM_DIR || path.join(process.env.HOME || "", ".nvm");
    const nvmSh = path.join(nvmDir, "nvm.sh");

    if (!fs.existsSync(nvmSh)) {
        console.error(
            `[node] .nvmrc pede Node ${wanted}, mas o nvm não está carregado (${nvmSh}).`
        );
        console.error(
            `[node] Instale o nvm ou use Node ${wanted} manualmente; seguindo com a versão atual.`
        );

        return true;
    }

    console.log(`[node] nvm install ${wanted} (via .nvmrc)`);

    const script = `
        set -e
        export NVM_DIR="${nvmDir.replace(/"/g, '\\"')}"
        . "$NVM_DIR/nvm.sh"
        nvm install "${wanted}"
        nvm use "${wanted}"
        node -v
        npm -v
    `;

    const result = spawnSync("bash", ["-lc", script], { stdio: "inherit" });

    if (result.status !== 0) {
        console.error(`[node] nvm install/use falhou para ${wanted}.`);

        return false;
    }

    return true;
}

function majorFromVersion(version) {
    const match = String(version).match(/\d+/);

    return match ? match[0] : null;
}

function currentNodeSatisfies(wanted) {
    const wantedMajor = majorFromVersion(wanted);
    const currentMajor = majorFromVersion(process.version);

    return Boolean(wantedMajor && currentMajor && wantedMajor === currentMajor);
}

function commandExists(name) {
    const probe = spawnSync(process.platform === "win32" ? "where.exe" : "which", [name], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
    });

    return probe.status === 0;
}

function tryWindowsNodeVersion(wanted) {
    if (currentNodeSatisfies(wanted)) {
        return true;
    }

    if (commandExists("fnm")) {
        const fnm = spawnSync("fnm", ["use", wanted], { stdio: "inherit" });

        if (fnm.status === 0) {
            return true;
        }
    }

    if (commandExists("nvm")) {
        const nvm = spawnSync("nvm", ["use", wanted], { stdio: "inherit" });

        if (nvm.status === 0) {
            return true;
        }
    }

    console.error(
        `[node] .nvmrc pede Node ${wanted} (atual ${process.version}). Instale Node ${wanted} ou fnm/nvm-windows.`
    );

    return true;
}

/**
 * Align Node with `.nvmrc` when nvm/fnm is available (same intent as scripts/ensure-node.sh).
 *
 * @param {string} rootDir Repo root
 * @returns {boolean} false when version tooling failed hard on Unix nvm
 */
export function ensureNodeFromNvmrc(rootDir) {
    const wanted = readNvmrcVersion(rootDir);

    if (!wanted) {
        return true;
    }

    if (currentNodeSatisfies(wanted)) {
        return true;
    }

    if (process.platform === "win32") {
        return tryWindowsNodeVersion(wanted);
    }

    return tryUnixNvm(wanted);
}

export function assertNodeOnPath() {
    const probe = spawnSync("node", ["-v"], { encoding: "utf8", shell: process.platform === "win32" });

    if (probe.status !== 0) {
        console.error("Error: node not found. Install Node.js (see .nvmrc) or nvm, then try again.");

        return false;
    }

    return true;
}
