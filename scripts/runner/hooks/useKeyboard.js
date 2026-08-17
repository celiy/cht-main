import { useInput } from "ink";

export function useKeyboard({
    onPrev,
    onNext,
    onQuit,
    onRestart,
    onClear,
    onScrollUp,
    onScrollDown,
    onScrollPageUp,
    onScrollPageDown
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

        if (key.pageUp) {
            onScrollPageUp();

            return;
        }

        if (key.pageDown) {
            onScrollPageDown();

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
