import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";

const DEFAULT_RING_SIZE = 5000;

function hasCommand(name) {
    const probe = spawnSync("sh", ["-c", `command -v ${name} >/dev/null 2>&1`]);

    return probe.status === 0;
}

function buildShellCommand(dir, cmd) {
    const useStdbuf = hasCommand("stdbuf");
    const prefix = useStdbuf ? "exec stdbuf -oL -eL " : "exec ";

    return `cd "${dir.replace(/"/g, '\\"')}" && ${prefix}${cmd}`;
}

export function freePorts(ports) {
    if (!Array.isArray(ports) || ports.length === 0) {
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

export class ManagedProcess extends EventEmitter {
    constructor({ id, name, dir, cmd, subtitle, ringSize = DEFAULT_RING_SIZE }) {
        super();

        this.id = id;
        this.name = name;
        this.dir = dir;
        this.cmd = cmd;
        this.subtitle = subtitle || "";
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

    start() {
        const shellCmd = buildShellCommand(this.dir, this.cmd);

        this.child = spawn("setsid", ["bash", "-c", shellCmd], {
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, FORCE_COLOR: "1" },
            detached: true
        });

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
            this.status = signal && code === null ? `signal:${signal}` : (code === 0 ? "exited" : "crashed");
            this.bumpVersion();
            this.emit("status", this);
        });
    }

    handleChunk(chunk, isErr) {
        const buf = isErr ? "partialErr" : "partial";
        const combined = this[buf] + chunk;
        const parts = combined.split("\n");

        this[buf] = parts.pop() || "";

        for (const line of parts) {
            this.appendLine(line);
        }
    }

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

    appendLine(line) {
        this.lines.push(line);

        if (this.lines.length > this.ringSize) {
            this.lines.splice(0, this.lines.length - this.ringSize);
        }

        this.bumpVersion();
        this.emit("line", line, this);
    }

    bumpVersion() {
        this.version += 1;
    }

    clear() {
        this.lines = [];
        this.bumpVersion();
        this.emit("cleared", this);
    }

    getTail(n) {
        if (n >= this.lines.length) {
            return this.lines.slice();
        }

        return this.lines.slice(this.lines.length - n);
    }

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

    async stop({ termTimeoutMs = 200 } = {}) {
        if (!this.child || this.child.pid == null) {
            return;
        }

        const pid = this.child.pid;

        try {
            process.kill(-pid, "SIGTERM");
        } catch {
            try {
                process.kill(pid, "SIGTERM");
            } catch {
                // ignore
            }
        }

        await new Promise((resolve) => setTimeout(resolve, termTimeoutMs));

        if (this.isAlive()) {
            try {
                process.kill(-pid, "SIGKILL");
            } catch {
                try {
                    process.kill(pid, "SIGKILL");
                } catch {
                    // ignore
                }
            }
        }
    }

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

    startAll() {
        for (const proc of this.processes) {
            proc.start();
        }
    }

    async stopAll() {
        await Promise.all(this.processes.map((proc) => proc.stop()));
    }

    get(idx) {
        return this.processes[idx];
    }

    get count() {
        return this.processes.length;
    }
}
