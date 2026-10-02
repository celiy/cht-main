import { ManagedProcess } from "./procManager.mjs";
import { sampleTree } from "./procUsage.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const proc = new ManagedProcess({
    id: "probe",
    name: "probe",
    dir: process.cwd(),
    cmd: "sleep 8"
});

try {
    proc.start();
    await wait(400);

    assert(proc.status === "running", `still running after 400ms, got ${proc.status} ${proc.exitCode}`);
    assert(Number.isInteger(proc.child?.pid) && proc.child.pid > 0, "has pid");

    const first = sampleTree(proc.child.pid);

    assert(first != null, "sampleTree after 400ms");
    assert(first.rssKb > 0, "rss after 400ms");

    await wait(1000);

    assert(proc.status === "running", `still running after 1.4s, got ${proc.status} ${proc.exitCode}`);

    const second = sampleTree(proc.child.pid);

    assert(second != null, "sampleTree after 1.4s");
    assert(second.rssKb > 0, "rss after 1.4s");
} finally {
    await proc.stop();
}

const slow = new ManagedProcess({
    id: "slow-term",
    name: "slow-term",
    dir: process.cwd(),
    cmd: "sh -c \"trap 'sleep 0.8; exit 0' TERM; while true; do sleep 1; done\""
});

try {
    slow.start();
    await wait(200);
    assert(slow.status === "running", "slow-term running");

    const started = Date.now();

    await slow.stop({ termTimeoutMs: 2000 });

    const elapsed = Date.now() - started;

    assert(!slow.isAlive(), "dead after stop");
    assert(elapsed >= 600 && elapsed < 1500, `waited for graceful TERM, got ${elapsed}ms`);
    assert(slow.exitCode === 0, `exit 0 from trap, got ${slow.status} ${slow.exitCode}`);
} finally {
    await slow.stop();
}

console.log("procManager ok");
