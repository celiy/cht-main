import React from "react";
import { Box, Text } from "ink";
import { truncateVisible } from "../../lib/ansiUtils.mjs";

export function LogPane({ proc, height, width }) {
    const innerHeight = Math.max(1, height - 2);
    const innerWidth = Math.max(10, width - 4);
    const lines = proc.getTail(innerHeight);
    const padding = innerHeight - lines.length;
    const filler = Array.from({ length: Math.max(0, padding) }, () => "");

    const titleLeft = proc.name;
    const titleRight = proc.subtitle || proc.dir;

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
                    <Text key={`line-${i}`}>
                        {truncateVisible(line || " ", innerWidth)}
                    </Text>
                ))}
            </Box>
        </Box>
    );
}
