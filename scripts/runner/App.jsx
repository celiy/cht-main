import React, { useEffect, useMemo, useState } from "react";
import { Box, useApp, useStdout } from "ink";
import { Header } from "./components/Header.jsx";
import { LogPane } from "./components/LogPane.jsx";
import { StatusBar } from "./components/StatusBar.jsx";
import { useProcesses } from "./hooks/useProcesses.js";
import { useKeyboard } from "./hooks/useKeyboard.js";
import { dedupeUrls, findUrls } from "../lib/ansiUtils.mjs";

function useTerminalSize() {
    const { stdout } = useStdout();
    const [size, setSize] = useState({
        columns: stdout.columns || 100,
        rows: stdout.rows || 30
    });

    useEffect(() => {
        const onResize = () => {
            setSize({
                columns: stdout.columns || 100,
                rows: stdout.rows || 30
            });
        };

        stdout.on("resize", onResize);

        return () => {
            stdout.off("resize", onResize);
        };
    }, [stdout]);

    return size;
}

export function App({ manager, clientName, onQuit }) {
    const { exit } = useApp();
    const [activeIdx, setActiveIdx] = useState(0);
    const { processes, tick } = useProcesses(manager);
    const { columns, rows } = useTerminalSize();

    const goNext = () => setActiveIdx((idx) => (idx + 1) % manager.count);
    const goPrev = () => setActiveIdx((idx) => (idx - 1 + manager.count) % manager.count);

    const quitNow = () => {
        if (onQuit) {
            onQuit();
        }

        exit();
    };

    const restartActive = () => {
        const proc = manager.get(activeIdx);

        if (proc) {
            proc.restart();
        }
    };

    const clearActive = () => {
        const proc = manager.get(activeIdx);

        if (proc) {
            proc.clear();
        }
    };

    useKeyboard({
        onPrev: goPrev,
        onNext: goNext,
        onQuit: quitNow,
        onRestart: restartActive,
        onClear: clearActive
    });

    const activeProc = processes[activeIdx];

    const urls = useMemo(() => {
        const collected = [];

        for (const proc of processes) {
            for (const line of proc.lines) {
                const found = findUrls(line);

                for (const url of found) {
                    collected.push(url);
                }
            }
        }

        return dedupeUrls(collected);
    }, [processes, tick]);

    const headerHeight = 4;
    const statusHeight = urls.length > 0 ? 4 : 3;
    const logHeight = Math.max(5, rows - headerHeight - statusHeight);

    return (
        <Box flexDirection="column" width={columns}>
            <Header
                processes={processes}
                activeIdx={activeIdx}
                clientName={clientName}
            />

            {activeProc && (
                <LogPane
                    proc={activeProc}
                    height={logHeight}
                    width={columns}
                />
            )}

            <StatusBar urls={urls} />
        </Box>
    );
}
