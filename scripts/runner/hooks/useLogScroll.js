import { useCallback, useRef, useState } from "react";

/**
 * Default state for the log scroll.
 * @returns {Object} The default state.
 */
function defaultState() {
    return { follow: true, start: 0 };
}

/**
 * Per-process log viewport. `follow` pins the view to the newest lines;
 * scrolling up freezes the window until the user reaches the bottom again.
 *
 * @param {string | null} procId Active process id
 * @param {number} lineCount Total lines in the active buffer
 * @param {number} viewHeight Visible row count
 */
export function useLogScroll(procId, lineCount, viewHeight) {
    const stateRef = useRef(new Map());
    const [, setTick] = useState(0);

    const read = (id) => {
        if (!id) {
            return defaultState();
        }

        return stateRef.current.get(id) || defaultState();
    };

    const write = (id, next) => {
        if (!id) {
            return;
        }

        stateRef.current.set(id, next);
        setTick((value) => value + 1);
    };

    const maxStart = Math.max(0, lineCount - viewHeight);
    const stored = read(procId);
    const start = stored.follow ? maxStart : Math.min(Math.max(0, stored.start), maxStart);
    const follow = start >= maxStart;

    const scrollBy = useCallback((delta) => {
        if (!procId || viewHeight < 1) {
            return;
        }

        const current = read(procId);
        const cap = Math.max(0, lineCount - viewHeight);
        const from = current.follow ? cap : Math.min(Math.max(0, current.start), cap);
        const nextStart = Math.min(cap, Math.max(0, from + delta));

        write(procId, {
            follow: nextStart >= cap,
            start: nextStart
        });
    }, [procId, lineCount, viewHeight]);

    const scrollPage = useCallback((direction) => {
        const page = Math.max(1, viewHeight - 1);

        scrollBy(direction < 0 ? -page : page);
    }, [scrollBy, viewHeight]);

    const reset = useCallback((id) => {
        const target = id || procId;

        if (!target) {
            return;
        }

        write(target, defaultState());
    }, [procId]);

    return {
        start,
        follow,
        maxStart,
        scrollBy,
        scrollPage,
        reset
    };
}
