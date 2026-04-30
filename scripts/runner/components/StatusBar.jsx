import React from "react";
import { Box, Text } from "ink";
import { osc8Link } from "../../lib/ansiUtils.mjs";

function Hint({ keyLabel, action }) {
    return (
        <Box marginRight={2}>
            <Text color="yellow" bold>{keyLabel}</Text>
            <Text dimColor> {action}</Text>
        </Box>
    );
}

export function StatusBar({ urls }) {
    return (
        <Box flexDirection="column" paddingX={1}>
            <Box flexDirection="row" flexWrap="wrap">
                <Hint keyLabel="←/→" action="switch tab" />
                <Hint keyLabel="r" action="restart" />
                <Hint keyLabel="c" action="clear" />
                <Hint keyLabel="q" action="quit" />
            </Box>

            {urls.length > 0 && (
                <Box flexDirection="row" flexWrap="wrap" marginTop={0}>
                    <Text dimColor>links: </Text>
                    {urls.slice(0, 5).map((url, idx) => (
                        <Box key={url} marginRight={2}>
                            <Text color="blueBright" underline>
                                {osc8Link(url, url)}
                            </Text>
                            {idx < urls.length - 1 ? null : null}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
