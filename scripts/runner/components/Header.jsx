import React from "react";
import { Box, Text } from "ink";
import { ProcessTab } from "./ProcessTab.jsx";

export function Header({ processes, activeIdx, clientName }) {
    return (
        <Box flexDirection="column">
            <Box paddingX={1}>
                <Text bold color="magenta">cht-runner</Text>
                <Text dimColor> · client=</Text>
                <Text color="cyan">{clientName}</Text>
            </Box>

            <Box flexDirection="row" paddingX={1}>
                {processes.map((proc, idx) => (
                    <ProcessTab
                        key={proc.id}
                        proc={proc}
                        active={idx === activeIdx}
                    />
                ))}
            </Box>
        </Box>
    );
}
