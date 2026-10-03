import React from "react";
import { Box, Text } from "ink";

/**
 * Chip component
 * @param {Object} props
 * @param {string} props.label The label.
 * @param {boolean} props.active Whether the chip is active.
 * @param {boolean} props.marked Whether the chip is marked.
 * @param {boolean} props.stacked Whether the chip is stacked.
 * @returns {React.ReactNode} The chip component.
 */
export function Chip({ label, active, marked, stacked }) {
    const mark = marked === true ? "● " : marked === false ? "○ " : "";

    return (
        <Box
            borderStyle={active ? "round" : "single"}
            borderColor={active ? "cyan" : "gray"}
            paddingX={1}
            marginRight={stacked ? 0 : 1}
            flexGrow={0}
            flexShrink={0}
            alignSelf="flex-start"
        >
            <Text bold={active} color={active ? "cyan" : undefined}>
                {mark}
                {label}
            </Text>
        </Box>
    );
}

/**
 * Arrow component
 * @returns {React.ReactNode} The arrow component.
 */
export function Arrow() {
    return (
        <Box
            height={3}
            marginX={1}
            flexGrow={0}
            flexShrink={0}
            alignItems="center"
            justifyContent="center"
        >
            <Text dimColor>➜</Text>
        </Box>
    );
}

/**
 * Hint component
 * @param {Object} props
 * @param {string} props.keyLabel The key label.
 * @param {string} props.action The action.
 * @returns {React.ReactNode} The hint component.
 */
export function Hint({ keyLabel, action }) {
    return (
        <Box marginRight={2}>
            <Text color="yellow" bold>{keyLabel}</Text>
            <Text dimColor> {action}</Text>
        </Box>
    );
}
