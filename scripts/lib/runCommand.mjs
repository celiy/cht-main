import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const IS_WIN = process.platform === "win32";

/**
 * Spawn a command and inherit the output
 * @param {string} command The command to run.
 * @param {string[]} [args] The arguments to pass to the command.
 * @param {{ cwd?: string, env?: Record<string, string | undefined> }} [options] The options to pass to the command.
 */
export function spawnSyncInherit(command, args = [], options = {}) {
    const { cwd, env: extraEnv = {} } = options;

    return spawnSync(command, args, {
        cwd,
        stdio: "inherit",
        env: { ...process.env, ...extraEnv },
        shell: IS_WIN
    });
}

/**
 * Spawn a command and pipe the output
 * @param {string} command The command to run.
 * @param {string[]} [args] The arguments to pass to the command.
 * @param {import("node:child_process").SpawnOptionsWithoutStdio} [options]
 */
export function spawnWithPipes(command, args = [], options = {}) {
    return spawn(command, args, {
        ...options,
        shell: options.shell ?? IS_WIN
    });
}

/**
 * Resolve a local npm bin script (handles `.cmd` on Windows).
 *
 * @param {string} dir Project root containing node_modules
 * @param {string} name Binary name without extension
 */
export function localBinPath(dir, name) {
    const binDir = path.join(dir, "node_modules", ".bin");
    const unix = path.join(binDir, name);

    if (!IS_WIN) {
        return unix;
    }

    const cmd = `${unix}.cmd`;

    if (fs.existsSync(cmd)) {
        return cmd;
    }

    const exe = `${unix}.exe`;

    if (fs.existsSync(exe)) {
        return exe;
    }

    return cmd;
}

export function isWindows() {
    return IS_WIN;
}
