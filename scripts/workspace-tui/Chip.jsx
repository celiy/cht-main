import React from "react";
import { Box, Text } from "ink";

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

export function Hint({ keyLabel, action }) {
    return (
        <Box marginRight={2}>
            <Text color="yellow" bold>{keyLabel}</Text>
            <Text dimColor> {action}</Text>
        </Box>
    );
}
