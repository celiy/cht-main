import React from "react";
import { render } from "ink";
import { parseClientFlag, resolveClient, buildProcessList, getVitePorts, listClientNames } from "../lib/clients.mjs";
import { ProcessManager, freePorts } from "../lib/procManager.mjs";
import { syncTsconfig } from "../sync-tsconfig.mjs";
import { App } from "./App.jsx";

function printHelp() {
    const known = ["dev", ...listClientNames()].join(", ");

    console.log("cht-runner - dev TUI for the cht-main monorepo");
    console.log("");
    console.log("Usage:");
    console.log("  node scripts/runner/index.jsx --client:<name>");
    console.log("");
    console.log(`Known clients: ${known}`);
}

async function main() {
    const argv = process.argv.slice(2);

    if (argv.includes("-h") || argv.includes("--help")) {
        printHelp();
        process.exit(0);
    }

    const { client } = parseClientFlag(argv);
    const resolved = resolveClient(client);
    const specs = buildProcessList(resolved);

    // Keep cht-base/tsconfig.app.json in sync with clients.json before
    // entering the alternate screen (silent unless something changes).
    syncTsconfig({ silent: true });

    if (specs.length === 0) {
        console.error("No processes resolved for client.");
        process.exit(1);
    }

    freePorts(getVitePorts());

    const manager = new ProcessManager(specs);

    let cleaningUp = false;
    let exitCode = 0;

    const cleanup = async () => {
        if (cleaningUp) {
            return;
        }

        cleaningUp = true;
        await manager.stopAll();
    };

    process.on("SIGINT", async () => {
        await cleanup();
        process.exit(130);
    });

    process.on("SIGTERM", async () => {
        await cleanup();
        process.exit(143);
    });

    process.on("exit", () => {
        manager.stopAll().catch(() => {});
    });

    manager.startAll();

    const { waitUntilExit } = render(
        <App
            manager={manager}
            clientName={resolved.name}
            onQuit={cleanup}
        />,
        { exitOnCtrlC: false }
    );

    try {
        await waitUntilExit();
    } catch (err) {
        console.error(err);
        exitCode = 1;
    } finally {
        await cleanup();
    }

    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
