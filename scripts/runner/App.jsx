import React, { useEffect, useMemo, useState } from "react";
import { Box, useApp, useStdout } from "ink";
import { Header } from "./components/Header.jsx";
import { LogPane, getLogViewHeight } from "./components/LogPane.jsx";
import { StatusBar } from "./components/StatusBar.jsx";
import { useProcesses } from "./hooks/useProcesses.js";
import { useKeyboard } from "./hooks/useKeyboard.js";
import { useLogScroll } from "./hooks/useLogScroll.js";
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

/**
 * Map mouse wheel to cursor up/down while Ink owns the alternate screen,
 * without capturing clicks (so OSC 8 links still work).
 */
function useAlternateScroll() {
    const { stdout } = useStdout();

    useEffect(() => {
        stdout.write("\x1b[?1007h");

        return () => {
            stdout.write("\x1b[?1007l");
        };
    }, [stdout]);
}

export function App({ manager, clientName, onQuit }) {
    const { exit } = useApp();
    const [activeIdx, setActiveIdx] = useState(0);
    const { processes, tick } = useProcesses(manager);
    const { columns, rows } = useTerminalSize();

    useAlternateScroll();

    const goNext = () => setActiveIdx((idx) => (idx + 1) % manager.count);
    const goPrev = () => setActiveIdx((idx) => (idx - 1 + manager.count) % manager.count);

    const quitNow = () => {
        if (onQuit) {
            onQuit();
        }

        exit();
    };

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
    const logViewHeight = getLogViewHeight(logHeight);

    const activeProc = processes[activeIdx];
    const lineCount = activeProc ? activeProc.lines.length : 0;

    const { start, follow, scrollBy, scrollPage, reset } = useLogScroll(
        activeProc ? activeProc.id : null,
        lineCount,
        logViewHeight
    );

    const restartActive = () => {
        const proc = manager.get(activeIdx);

        if (proc) {
            reset(proc.id);
            proc.restart();
        }
    };

    const clearActive = () => {
        const proc = manager.get(activeIdx);

        if (proc) {
            reset(proc.id);
            proc.clear();
        }
    };

    useKeyboard({
        onPrev: goPrev,
        onNext: goNext,
        onQuit: quitNow,
        onRestart: restartActive,
        onClear: clearActive,
        onScrollUp: () => scrollBy(-1),
        onScrollDown: () => scrollBy(1),
        onScrollPageUp: () => scrollPage(-1),
        onScrollPageDown: () => scrollPage(1)
    });

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
                    start={start}
                    follow={follow}
                    totalLines={lineCount}
                />
            )}

            <StatusBar urls={urls} />
        </Box>
    );
}
