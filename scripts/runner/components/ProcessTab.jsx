import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

function statusColor(status) {
    if (status === "running") {
        return "green";
    }

    if (status === "starting") {
        return "yellow";
    }

    if (status === "exited") {
        return "blueBright";
    }

    return "red";
}

function statusLabel(proc) {
    if (proc.status === "running") {
        return "running";
    }

    if (proc.status === "starting") {
        return "starting";
    }

    if (proc.status === "exited") {
        return `exit ${proc.exitCode ?? 0}`;
    }

    if (proc.status === "crashed") {
        return `crashed ${proc.exitCode ?? "?"}`;
    }

    return proc.status;
}

export function ProcessTab({ proc, active }) {
    const color = statusColor(proc.status);
    const label = statusLabel(proc);
    const showSpinner = proc.status === "starting";

    return (
        <Box
            borderStyle={active ? "round" : "single"}
            borderColor={active ? "cyan" : "gray"}
            paddingX={1}
            marginRight={1}
        >
            <Text bold={active} color={active ? "cyan" : undefined}>
                {proc.name}
            </Text>
            <Text dimColor> · </Text>
            <Text color={color}>
                {showSpinner ? <Spinner type="dots" /> : "●"}
                {" "}
                {label}
            </Text>
        </Box>
    );
}
