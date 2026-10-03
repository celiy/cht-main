import { useInput } from "ink";

const FAST_PAGE_COUNT = 5;

/**
 * Use keyboard input
 * @param {Object} props
 * @param {Function} props.onPrev The function to call when the previous tab is selected.
 * @param {Function} props.onNext The function to call when the next tab is selected.
 * @param {Function} props.onQuit The function to call when the runner is quit.
 * @param {Function} props.onRestart The function to call when the runner is restarted.
 * @param {Function} props.onClear The function to call when the runner is cleared.
 * @param {Function} props.onScrollUp The function to call when the scroll up key is pressed.
 * @param {Function} props.onScrollDown The function to call when the scroll down key is pressed.
 * @param {Function} props.onScrollPageUp The function to call when the scroll page up key is pressed.
 * @param {Function} props.onScrollPageDown The function to call when the scroll page down key is pressed.
 * @param {Function} props.onScrollTop The function to call when the scroll top key is pressed.
 * @param {Function} props.onScrollBottom The function to call when the scroll bottom key is pressed.
 * @returns {void}
 */
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
