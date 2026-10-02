import { spawnSync } from "node:child_process";
import fs from "node:fs";

const IS_LINUX = process.platform === "linux";

function readClkTck() {
    if (!IS_LINUX) {
        return 100;
    }

    const result = spawnSync("getconf", ["CLK_TCK"], { encoding: "utf8" });
    const ticks = Number((result.stdout || "").trim());

    return Number.isFinite(ticks) && ticks > 0 ? ticks : 100;
}

const CLK_TCK = readClkTck();

/**
 * utime+stime clock ticks from a `/proc/<pid>/stat` line.
 *
 * @param {string} stat
 * @returns {number}
 */
export function parseStatTicks(stat) {
    const close = String(stat).lastIndexOf(")");

    if (close < 0) {
        return 0;
    }

    const rest = String(stat)
        .slice(close + 2)
        .trim()
        .split(/\s+/);
    const utime = Number(rest[11]);
    const stime = Number(rest[12]);

    if (!Number.isFinite(utime) || !Number.isFinite(stime)) {
        return 0;
    }

    return utime + stime;
}

/**
 * VmRSS kilobytes from a `/proc/<pid>/status` blob.
 *
 * @param {string} status
 * @returns {number}
 */
export function parseRssKb(status) {
    const match = String(status).match(/^VmRSS:\s+(\d+)/m);

    return match ? Number(match[1]) : 0;
}

function listChildren(pid) {
    try {
        const raw = fs.readFileSync(`/proc/${pid}/task/${pid}/children`, "utf8");

        if (!raw.trim()) {
            return [];
        }

        return raw
            .trim()
            .split(/\s+/)
            .map((token) => Number(token))
            .filter((child) => Number.isInteger(child) && child > 0);
    } catch {
        return [];
    }
}

function walkTree(rootPid) {
    const pids = [];
    const stack = [rootPid];
    const seen = new Set();

    while (stack.length > 0) {
        const pid = stack.pop();

        if (!pid || seen.has(pid)) {
            continue;
        }

        seen.add(pid);
        pids.push(pid);
        stack.push(...listChildren(pid));
    }

    return pids;
}

function readPidTicks(pid) {
    return parseStatTicks(fs.readFileSync(`/proc/${pid}/stat`, "utf8"));
}

function readPidRssKb(pid) {
    return parseRssKb(fs.readFileSync(`/proc/${pid}/status`, "utf8"));
}

/**
 * Snapshot CPU ticks + RSS for a process and its descendants.
 * Linux `/proc` only; returns null elsewhere.
 *
 * ponytail: tree walk via `/proc/<pid>/task/<pid>/children` — misses threads
 * that never show as processes. Upgrade: smaps_rollup / pidfd on cgroup v2.
 *
 * @param {number} pid
 * @returns {{ ticks: number, rssKb: number, at: number } | null}
 */
export function sampleTree(pid) {
    if (!IS_LINUX || !Number.isInteger(pid) || pid <= 0) {
        return null;
    }

    let ticks = 0;
    let rssKb = 0;
    let any = false;

    for (const child of walkTree(pid)) {
        try {
            ticks += readPidTicks(child);
            rssKb += readPidRssKb(child);
            any = true;
        } catch {
            // process raced out of /proc
        }
    }

    if (!any) {
        return null;
    }

    return { ticks, rssKb, at: Date.now() };
}

/**
 * @param {{ ticks: number, rssKb: number, at: number }} prev
 * @param {{ ticks: number, rssKb: number, at: number }} next
 * @returns {{ cpu: number, rssMb: number }}
 */
export function usageDelta(prev, next) {
    const elapsedSec = (next.at - prev.at) / 1000;
    const rssMb = next.rssKb / 1024;
    const tickDelta = Math.max(0, next.ticks - prev.ticks);

    if (!(elapsedSec > 0)) {
        return { cpu: 0, rssMb };
    }

    return {
        cpu: (tickDelta / CLK_TCK / elapsedSec) * 100,
        rssMb
    };
}

function formatRss(rssMb) {
    if (!Number.isFinite(rssMb) || rssMb < 0) {
        return "0M";
    }

    if (rssMb >= 1024) {
        return `${(rssMb / 1024).toFixed(1)}G`;
    }

    if (rssMb >= 10) {
        return `${Math.round(rssMb)}M`;
    }

    return `${rssMb.toFixed(1)}M`;
}

/**
 * Compact `12% 84M` for a process tab.
 *
 * @param {{ cpu: number, rssMb: number } | null | undefined} usage
 * @returns {string}
 */
export function formatUsage(usage) {
    if (!usage) {
        return "";
    }

    const cpu = Number.isFinite(usage.cpu) ? Math.max(0, Math.round(usage.cpu)) : 0;

    return `${cpu}% ${formatRss(usage.rssMb)}`;
}
