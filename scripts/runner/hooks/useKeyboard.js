import { useInput } from "ink";

const FAST_PAGE_COUNT = 5;

export function useKeyboard({
    onPrev,
    onNext,
    onQuit,
    onRestart,
    onClear,
    onScrollUp,
    onScrollDown,
    onScrollPageUp,
    onScrollPageDown,
    onScrollTop,
    onScrollBottom
}) {
    useInput((input, key) => {
        if (key.upArrow || input === "k" || input === "K") {
            onScrollUp();

            return;
        }

        if (key.downArrow || input === "j" || input === "J") {
            onScrollDown();

            return;
        }

        if (key.home || input === "g") {
            onScrollTop();

            return;
        }

        if (key.end || input === "G") {
            onScrollBottom();

            return;
        }

        if (key.pageUp) {
            onScrollPageUp(key.shift || key.ctrl ? FAST_PAGE_COUNT : 1);

            return;
        }

        if (key.pageDown) {
            onScrollPageDown(key.shift || key.ctrl ? FAST_PAGE_COUNT : 1);

            return;
        }

        if (key.leftArrow || input === "h" || input === "H") {
            onPrev();

            return;
        }

        if (key.rightArrow || input === "l" || input === "L") {
            onNext();

            return;
        }

        if (input === "q" || input === "Q" || (key.ctrl && input === "c")) {
            onQuit();

            return;
        }

        if (input === "r" || input === "R") {
            onRestart();

            return;
        }

        if (input === "c" || input === "C") {
            onClear();
        }
    });
}
