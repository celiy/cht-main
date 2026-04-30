import { useInput } from "ink";

export function useKeyboard({ onPrev, onNext, onQuit, onRestart, onClear }) {
    useInput((input, key) => {
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
