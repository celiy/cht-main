import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import {
    createDraft,
    currentStep,
    flavorOptions,
    focusedHint,
    formatSelectionLine,
    reduceWizard,
    stepQuestion,
    toWorkspaceChoices
} from "../lib/wizardState.mjs";
import { Arrow, Chip, Hint } from "./Chip.jsx";

/**
 * Workspace TUI component
 * @param {Object} props
 * @param {Object[]} props.saveTargets The save targets.
 * @param {Function} props.onFinish The function to call when the workspace is finished.
 * @returns {React.ReactNode} The workspace TUI component.
 */
export function App({ saveTargets, onFinish }) {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const finished = useRef(false);
    const [draft, setDraft] = useState(() => createDraft(saveTargets));
    const [columns, setColumns] = useState(stdout.columns || 80);

    useEffect(() => {
        const onResize = () => {
            setColumns(stdout.columns || 80);
        };

        stdout.on("resize", onResize);

        return () => {
            stdout.off("resize", onResize);
        };
    }, [stdout]);

    const finish = (payload) => {
        if (finished.current) {
            return;
        }

        finished.current = true;
        onFinish(payload);
        exit();
    };

    useEffect(() => {
        if (draft.cancel) {
            finish({ cancel: true });
        }

        if (draft.done) {
            finish({ cancel: false, choices: toWorkspaceChoices(draft) });
        }
    }, [draft]);

    useInput((input, key) => {
        if (finished.current) {
            return;
        }

        if (key.ctrl && input === "c") {
            setDraft((current) => reduceWizard(current, "quit"));

            return;
        }

        if (input === "q" || input === "Q") {
            setDraft((current) => reduceWizard(current, "quit"));

            return;
        }

        let action = null;

        if (key.leftArrow || input === "h" || input === "H") {
            action = "left";
        } else if (key.rightArrow || input === "l" || input === "L") {
            action = "right";
        } else if (key.upArrow || input === "k" || input === "K") {
            action = "left";
        } else if (key.downArrow || input === "j" || input === "J") {
            action = "right";
        } else if (key.return) {
            action = "enter";
        } else if (input === " ") {
            action = "space";
        } else if (key.backspace || key.escape || input === "b" || input === "B") {
            action = "back";
        }

        if (!action) {
            return;
        }

        setDraft((current) => reduceWizard(current, action));
    });

    const step = currentStep(draft);
    const flavors = flavorOptions(draft);
    const hint = focusedHint(draft);
    const vertical = Boolean(step.vertical);
    const moveHint = draft.lane === "flavor" ? "←/→" : vertical ? "↑/↓" : "←/→";

    return (
        <Box flexDirection="column" width={columns} paddingX={1}>
            <Text dimColor>cht-install · workspace</Text>
            <Text bold>{stepQuestion(draft)}</Text>

            {vertical ? (
                <Box
                    flexDirection="column"
                    flexGrow={0}
                    flexShrink={0}
                    alignSelf="flex-start"
                    alignItems="flex-start"
                >
                    {step.options.map((option, index) => (
                        <Box
                            key={option.id}
                            flexDirection="row"
                            flexGrow={0}
                            flexShrink={0}
                            alignItems="center"
                            alignSelf="flex-start"
                        >
                            <Chip
                                label={option.label}
                                active={draft.lane === "primary" && draft.primaryIdx === index}
                                marked={step.multi && option.id !== "continue"
                                    ? draft.values.ai.includes(option.id)
                                    : undefined}
                                stacked
                            />
                            {draft.flavorsOpen && draft.primaryIdx === index
                                ? (
                                    <>
                                        <Arrow />
                                        {flavors.map((flavor, flavorIndex) => (
                                            <Chip
                                                key={`flavor-${flavor.id}`}
                                                label={flavor.label}
                                                active={draft.lane === "flavor" && draft.flavorIdx === flavorIndex}
                                            />
                                        ))}
                                    </>
                                )
                                : null}
                        </Box>
                    ))}
                </Box>
            ) : (
                <Box
                    flexDirection="row"
                    flexWrap="wrap"
                    flexGrow={0}
                    flexShrink={0}
                    alignSelf="flex-start"
                    alignItems="center"
                >
                    {step.options.map((option, index) => (
                        <Chip
                            key={option.id}
                            label={option.label}
                            active={draft.lane === "primary" && draft.primaryIdx === index}
                        />
                    ))}

                    {flavors.length > 0 ? (
                        <>
                            <Arrow />
                            {flavors.map((option, index) => (
                                <Chip
                                    key={`flavor-${option.id}`}
                                    label={option.label}
                                    active={draft.lane === "flavor" && draft.flavorIdx === index}
                                />
                            ))}
                        </>
                    ) : null}
                </Box>
            )}

            {hint ? <Text dimColor>{hint}</Text> : null}

            <Box marginTop={1} flexDirection="row" flexWrap="wrap">
                <Hint keyLabel={moveHint} action="mover" />
                <Hint keyLabel="enter" action="confirmar" />
                <Hint keyLabel="backspace" action="voltar" />
                <Hint keyLabel="q" action="cancelar" />
            </Box>

            {formatSelectionLine(draft) ? (
                <Text dimColor wrap="truncate">{formatSelectionLine(draft)}</Text>
            ) : null}
        </Box>
    );
}
