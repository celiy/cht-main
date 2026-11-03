import React from "react";
import { Box, Text } from "ink";
import { truncateVisible } from "../../lib/ansiUtils.mjs";

/**
 * Log pane component
 * @param {Object} props
 * @param {object} props.proc The process.
 * @param {number} props.height The height of the pane.
 * @param {number} props.width The width of the pane.
 * @param {number} props.start The start line.
 * @returns {React.ReactNode} The log pane component.
 */
export function LogPane({ proc, height, width, start }) {
    const innerHeight = Math.max(1, height - 2);
    const innerWidth = Math.max(10, width - 4);
    const lines = proc.getWindow(start, innerHeight);
    const padding = innerHeight - lines.length;
    const filler = Array.from({ length: Math.max(0, padding) }, () => "");

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="cyan"
            width={width}
            height={height}
            paddingX={1}
        >
            <Box flexDirection="column" flexGrow={1}>
                {filler.map((_, i) => (
                    <Text key={`pad-${i}`}> </Text>
                ))}
                {lines.map((line, i) => (
                    <Text key={`line-${start + i}`}>
                        {truncateVisible(line || " ", innerWidth)}
                    </Text>
                ))}
            </Box>
        </Box>
    );
}

/**
 * Get the height of the log view
 * @param {number} paneHeight The height of the pane.
 * @returns {number} The height of the log view.
 */
export function getLogViewHeight(paneHeight) {
    return Math.max(1, paneHeight - 2);
}
