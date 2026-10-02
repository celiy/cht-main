import { parseRssKb, parseStatTicks, formatUsage, usageDelta, sampleTree } from "./procUsage.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

function makeStat(utime, stime) {
    const fields = Array(22).fill("0");

    fields[0] = "S";
    fields[11] = String(utime);
    fields[12] = String(stime);

    return `9 (node --title) ${fields.join(" ")}`;
}

assert(parseStatTicks(makeStat(100, 50)) === 150, "utime+stime");
assert(parseStatTicks("broken") === 0, "bad stat");
assert(parseRssKb("Name:\tnode\nVmRSS:\t12345 kB\n") === 12345, "VmRSS");
assert(parseRssKb("Name:\tnode\n") === 0, "missing VmRSS");

const delta = usageDelta(
    { ticks: 100, rssKb: 2048, at: 1000 },
    { ticks: 200, rssKb: 4096, at: 2000 }
);

assert(delta.rssMb === 4, "rssMb from kb");
assert(delta.cpu > 0, "cpu from tick delta");

assert(formatUsage({ cpu: 12.4, rssMb: 84.2 }) === "12% 84M", "format mid");
assert(formatUsage({ cpu: 0, rssMb: 1.25 }) === "0% 1.3M", "format small");
assert(formatUsage(null) === "", "format empty");

if (process.platform === "linux") {
    const snap = sampleTree(process.pid);

    assert(snap != null, "self sample");
    assert(snap.rssKb > 0, "self rss");
}

console.log("procUsage ok");
