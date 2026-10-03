import { useEffect, useRef, useState } from "react";
import { sampleTree, usageDelta } from "../../lib/procUsage.mjs";

const USAGE_INTERVAL_MS = 1000;

/**
 * Use processes
 * @param {Object} manager The manager.
 * @returns {Object} The processes (processes, usageById, tick).
 */
export function useProcesses(manager) {
    const [tick, setTick] = useState(0);
    const [usageById, setUsageById] = useState({});
    const prevRef = useRef(new Map());

    useEffect(() => {
        const onUpdate = () => setTick((t) => t + 1);

        manager.on("update", onUpdate);

        return () => {
            manager.off("update", onUpdate);
        };
    }, [manager]);

    useEffect(() => {
        const sample = () => {
            const next = {};

            for (const proc of manager.processes) {
                const pid = proc.child?.pid;

                if (!pid || proc.status !== "running") {
                    next[proc.id] = null;
                    prevRef.current.delete(proc.id);
                    continue;
                }

                const snap = sampleTree(pid);

                if (!snap) {
                    next[proc.id] = null;
                    continue;
                }

                const before = prevRef.current.get(proc.id);

                prevRef.current.set(proc.id, { pid, ...snap });

                if (!before || before.pid !== pid) {
                    next[proc.id] = { cpu: 0, rssMb: snap.rssKb / 1024 };
                    continue;
                }

                next[proc.id] = usageDelta(before, snap);
            }

            setUsageById(next);
        };

        sample();
        const timer = setInterval(sample, USAGE_INTERVAL_MS);

        return () => {
            clearInterval(timer);
        };
    }, [manager]);

    return {
        processes: manager.processes,
        usageById,
        tick
    };
}
