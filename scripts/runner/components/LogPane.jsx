import React from "react";
import { Box, Text } from "ink";
import { truncateVisible } from "../../lib/ansiUtils.mjs";

export function LogPane({ proc, height, width, start, follow, totalLines }) {
    const titleRows = 1;
    const innerHeight = Math.max(1, height - 2 - titleRows);
    const innerWidth = Math.max(10, width - 4);
    const lines = proc.getWindow(start, innerHeight);
    const padding = innerHeight - lines.length;
    const filler = Array.from({ length: Math.max(0, padding) }, () => "");

    const titleLeft = proc.name;
    const titleRight = follow || totalLines <= innerHeight
        ? (proc.subtitle || proc.dir)
        : `${start + 1}-${start + lines.length} / ${totalLines}`;

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="cyan"
            width={width}
            height={height}
            paddingX={1}
        >
            <Box justifyContent="space-between">
                <Text bold color="cyan">{titleLeft}</Text>
                <Text dimColor>{titleRight}</Text>
            </Box>

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

export function getLogViewHeight(paneHeight) {
    return Math.max(1, paneHeight - 3);
}
