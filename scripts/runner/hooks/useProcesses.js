import { useEffect, useState } from "react";

export function useProcesses(manager) {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const onUpdate = () => setTick((t) => t + 1);

        manager.on("update", onUpdate);

        return () => {
            manager.off("update", onUpdate);
        };
    }, [manager]);

    return {
        processes: manager.processes,
        tick
    };
}
