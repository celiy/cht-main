import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { isWindows, spawnWithPipes } from "./runCommand.mjs";

const DEFAULT_RING_SIZE = 5000;
const IS_WIN = isWindows();

/**
 * Check if a command exists
 * @param {string} name
 * @returns {boolean} True if the command exists.
 */
function hasCommand(name) {
    if (IS_WIN) {
        const probe = spawnSync("where", [name], { stdio: "ignore", shell: true });

        return probe.status === 0;
    }

    const probe = spawnSync("sh", ["-c", `command -v ${name} >/dev/null 2>&1`]);

    return probe.status === 0;
}

/**
 * Build a shell command
 * @param {string} dir
 * @param {string} cmd
 * @returns {string} The shell command.
 */
function buildShellCommand(dir, cmd) {
    const useStdbuf = hasCommand("stdbuf");
    const prefix = useStdbuf ? "exec stdbuf -oL -eL " : "exec ";
    const escapedDir = dir.replace(/"/g, '\\"');

    return `cd "${escapedDir}" && ${prefix}${cmd}`;
}

/**
 * Kill a Windows port
 * @param {number} port
 * @returns {void}
 */
function killWindowsPort(port) {
    const result = spawnSync("netstat", ["-ano"], { encoding: "utf8", shell: true });

    if (result.status !== 0) {
        return;
    }

    const portPattern = new RegExp(`:${port}\\s`);
    const pids = new Set();

    for (const line of (result.stdout || "").split("\n")) {
        if (!line.includes("LISTENING") || !portPattern.test(line)) {
            continue;
        }

        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && /^\d+$/.test(pid) && pid !== "0") {
            pids.add(pid);
        }
    }

    for (const pid of pids) {
        spawnSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore", shell: true });
    }
}

/**
 * Free ports
 * @param {number[]} ports
 * @returns {void}
 */
export function freePorts(ports) {
    if (!Array.isArray(ports) || ports.length === 0) {
        return;
    }

    if (IS_WIN) {
        for (const port of ports) {
            killWindowsPort(port);
        }

        return;
    }

    const useFuser = hasCommand("fuser");

    for (const port of ports) {
        if (useFuser) {
            spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });

            continue;
        }

        if (hasCommand("lsof")) {
            const result = spawnSync("lsof", ["-t", "-i", `:${port}`], { encoding: "utf8" });
            const pids = (result.stdout || "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

            for (const pid of pids) {
                try {
                    process.kill(Number(pid), "SIGTERM");
                } catch {
                    // ignore
                }
            }
        }
    }
}

/**
 * Wait for a number of milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a child process to exit
 * @param {ChildProcess} child
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForExit(child, timeoutMs) {
    return new Promise((resolve) => {
        if (!child || child.exitCode != null || child.signalCode != null) {
            resolve();

            return;
        }

        const onExit = () => {
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(() => {
            child.off("exit", onExit);
            resolve();
        }, timeoutMs);

        child.once("exit", onExit);
    });
}

/**
 * Check if a process group is alive
 * @param {number} pgid
 * @returns {boolean} True if the process group is alive.
 */
function isGroupAlive(pgid) {
    if (!Number.isInteger(pgid) || pgid <= 0) {
        return false;
    }

    try {
        process.kill(-pgid, 0);

        return true;
    } catch {
        try {
            process.kill(pgid, 0);

            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Wait until a process group is dead
 * @param {number} pgid
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
async function waitUntilGroupDead(pgid, timeoutMs) {
    const deadline = Date.now() + timeoutMs;

    while (isGroupAlive(pgid) && Date.now() < deadline) {
        await waitMs(50);
    }
}

/**
 * Signal a process group
 * @param {number} pid
 * @param {string} signal
 * @returns {void}
 */
function signalGroup(pid, signal) {
    try {
        process.kill(-pid, signal);
    } catch {
        try {
            process.kill(pid, signal);
        } catch {
            // already gone
        }
    }
}

/**
 * Managed process
 * @param {Object} spec
 * @returns {ManagedProcess}
 */
export class ManagedProcess extends EventEmitter {
    constructor({ id, name, dir, cmd, subtitle, env, ringSize = DEFAULT_RING_SIZE }) {
        super();

        this.id = id;
        this.name = name;
        this.dir = dir;
        this.cmd = cmd;
        this.subtitle = subtitle || "";
        this.env = env && typeof env === "object" ? env : {};
        this.ringSize = ringSize;
        this.lines = [];
        this.partial = "";
        this.partialErr = "";
        this.status = "starting";
        this.exitCode = null;
        this.child = null;
        this.startedAt = null;
        this.version = 0;
    }

    /**
     * Start the process
     * @returns {void}
     */
    start() {
        const env = { ...process.env, FORCE_COLOR: "1", ...this.env };

        if (this.env.CHT_DEVAPP === "1") {
            delete env.CLIENT;
        }

        if (IS_WIN) {
            this.child = spawnWithPipes(this.cmd, [], {
                cwd: this.dir,
                stdio: ["ignore", "pipe", "pipe"],
                env,
                shell: true
            });
        } else {
            const shellCmd = buildShellCommand(this.dir, this.cmd);

            // detached:true already calls setsid() in the child. The `setsid`
            // binary forks, exits 0, and leaves the real command untracked.
            this.child = spawn("bash", ["-c", shellCmd], {
                stdio: ["ignore", "pipe", "pipe"],
                env,
                detached: true
            });
        }

        this.startedAt = Date.now();
        this.status = "running";
        this.bumpVersion();

        this.child.stdout.setEncoding("utf8");
        this.child.stderr.setEncoding("utf8");

        this.child.stdout.on("data", (chunk) => this.handleChunk(chunk, false));
        this.child.stderr.on("data", (chunk) => this.handleChunk(chunk, true));

        this.child.on("error", (err) => {
            this.appendLine(`[runner] spawn error: ${err.message}`);
            this.status = "crashed";
            this.bumpVersion();
            this.emit("status", this);
        });

        this.child.on("exit", (code, signal) => {
            this.flushPartial();
            this.exitCode = code;
            this.status =
                signal && code === null ? `signal:${signal}` : code === 0 ? "exited" : "crashed";
            this.bumpVersion();
            this.emit("status", this);
        });
    }

    /**
     * Handle a chunk of data
     * @param {string} chunk
     * @param {boolean} isErr
     * @returns {void}
     */
    handleChunk(chunk, isErr) {
        const buf = isErr ? "partialErr" : "partial";
        const combined = this[buf] + chunk;
        const parts = combined.split("\n");

        this[buf] = parts.pop() || "";

        for (const line of parts) {
            this.appendLine(line);
        }
    }

    /**
     * Flush the partial data
     * @returns {void}
     */
    flushPartial() {
        if (this.partial) {
            this.appendLine(this.partial);
            this.partial = "";
        }

        if (this.partialErr) {
            this.appendLine(this.partialErr);
            this.partialErr = "";
        }
    }

    /**
     * Append a line to the log
     * @param {string} line
     * @returns {void}
     */
    appendLine(line) {
        this.lines.push(line);

        if (this.lines.length > this.ringSize) {
            this.lines.splice(0, this.lines.length - this.ringSize);
        }

        this.bumpVersion();
        this.emit("line", line, this);
    }

    /**
     * Bump the version
     * @returns {void}
     */
    bumpVersion() {
        this.version += 1;
    }

    /**
     * Clear the log
     * @returns {void}
     */
    clear() {
        this.lines = [];
        this.bumpVersion();
        this.emit("cleared", this);
    }

    /**
     * Get the tail of the log
     * @param {number} n
     * @returns {string[]} The tail of the log.
     */
    getTail(n) {
        if (n >= this.lines.length) {
            return this.lines.slice();
        }

        return this.lines.slice(this.lines.length - n);
    }

    /**
     * Slice a window of log lines starting at `start`.
     *
     * @param {number} start First line index
     * @param {number} count Maximum number of lines
     * @returns {string[]}
     */
    getWindow(start, count) {
        const from = Math.max(0, start);

        return this.lines.slice(from, from + Math.max(0, count));
    }

    /**
     * Check if the process is alive
     * @returns {boolean} True if the process is alive.
     */
    isAlive() {
        if (!this.child || this.child.pid == null) {
            return false;
        }

        try {
            process.kill(this.child.pid, 0);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Stop the process
     * @param {Object} options
     * @param {number} options.termTimeoutMs
     * @param {number} options.killTimeoutMs
     * @returns {Promise<void>}
     */
    async stop({ termTimeoutMs = 5000, killTimeoutMs = 1000 } = {}) {
        if (!this.child || this.child.pid == null) {
            return;
        }

        const pid = this.child.pid;
        const child = this.child;

        if (IS_WIN) {
            spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", shell: true });
            await waitForExit(child, termTimeoutMs);

            return;
        }

        signalGroup(pid, "SIGTERM");
        await waitUntilGroupDead(pid, termTimeoutMs);

        if (isGroupAlive(pid)) {
            signalGroup(pid, "SIGKILL");
            await waitUntilGroupDead(pid, killTimeoutMs);
        }
    }

    /**
     * Restart the process
     * @returns {Promise<void>}
     */
    async restart() {
        await this.stop();

        this.lines = [];
        this.partial = "";
        this.partialErr = "";
        this.exitCode = null;
        this.status = "starting";
        this.child = null;
        this.bumpVersion();
        this.emit("status", this);
        this.start();
    }
}

/**
 * Process manager
 * @param {Object[]} specs
 * @returns {ProcessManager}
 */
export class ProcessManager extends EventEmitter {
    constructor(specs) {
        super();
        this.processes = specs.map((spec) => new ManagedProcess(spec));

        for (const proc of this.processes) {
            proc.on("line", () => this.emit("update", proc));
            proc.on("status", () => this.emit("update", proc));
            proc.on("cleared", () => this.emit("update", proc));
        }
    }

    /**
     * Start all processes
     * @returns {void}
     */
    startAll() {
        for (const proc of this.processes) {
            proc.start();
        }
    }

    /**
     * Stop all processes
     * @returns {Promise<void>}
     */
    async stopAll() {
        await Promise.all(this.processes.map((proc) => proc.stop()));
    }

    /**
     * Get a process by index
     * @param {number} idx
     * @returns {ManagedProcess}
     */
    get(idx) {
        return this.processes[idx];
    }

    /**
     * Get the number of processes
     * @returns {number} The number of processes.
     */
    get count() {
        return this.processes.length;
    }
}
