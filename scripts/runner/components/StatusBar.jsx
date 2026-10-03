import React from "react";
import { Box, Text } from "ink";
import { osc8Link } from "../../lib/ansiUtils.mjs";

/**
 * Hint component
 * @param {Object} props
 * @param {string} props.keyLabel The key label.
 * @param {string} props.action The action.
 * @returns {React.ReactNode} The hint component.
 */
function Hint({ keyLabel, action }) {
    return (
        <Box marginRight={2}>
            <Text color="yellow" bold>{keyLabel}</Text>
            <Text dimColor> {action}</Text>
        </Box>
    );
}

/**
 * Status bar component
 * @param {Object} props
 * @param {Object[]} props.linkGroups The link groups.
 * @returns {React.ReactNode} The status bar component.
 */
export function StatusBar({ linkGroups }) {
    const groups = linkGroups ?? [];

    return (
        <Box flexDirection="column" paddingX={1}>
            <Box flexDirection="row" flexWrap="wrap">
                <Hint keyLabel="←/→" action="switch tab" />
                <Hint keyLabel="↑/↓" action="scroll" />
                <Hint keyLabel="Home/End" action="top/bot" />
                <Hint keyLabel="PgUp/Dn" action="page" />
                <Hint keyLabel="S-PgUp" action="×5" />
                <Hint keyLabel="r" action="restart" />
                <Hint keyLabel="c" action="clear" />
                <Hint keyLabel="q" action="quit" />
            </Box>

            {groups.map((group) => (
                <Box key={group.id} flexDirection="row" flexWrap="wrap">
                    <Text dimColor>{group.name}: </Text>
                    {group.urls.map((url) => (
                        <Box key={url} marginRight={2}>
                            <Text color="blueBright" underline>
                                {osc8Link(url, url)}
                            </Text>
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    );
}
