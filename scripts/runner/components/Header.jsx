import React from "react";
import { Box, Text } from "ink";
import { ProcessTab } from "./ProcessTab.jsx";

/**
 * Header component
 * @param {Object} props
 * @param {object[]} props.processes The processes.
 * @param {Record<string, object>} props.usageById The usage by ID.
 * @param {number} props.activeIdx The active index.
 * @param {string} props.clientName The client name.
 * @returns {React.ReactNode} The header component.
 */
export function Header({ processes, usageById, activeIdx, clientName }) {
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
                        usage={usageById?.[proc.id]}
                        active={idx === activeIdx}
                    />
                ))}
            </Box>
        </Box>
    );
}
