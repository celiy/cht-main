import { render } from "ink";
import { parseClientFlag, resolveClient, buildProcessList, getVitePorts, listClientNames } from "../lib/clients.mjs";
import { ProcessManager, freePorts } from "../lib/procManager.mjs";
import { findFreePort } from "../lib/ports.mjs";
import { App } from "./App.jsx";

/**
 * Print the help message
 * @returns {void}
 */
function printHelp() {
    const known = ["dev", ...listClientNames()].join(", ");

    console.log("cht-runner - dev TUI for the cht-main monorepo");
    console.log("");
    console.log("Usage:");
    console.log("  node scripts/runner/index.jsx --client:<name> [--no-backend]");
    console.log("");
    console.log("Flags:");
    console.log("  --no-backend   Skip the backend process (front-end + docs only).");
    console.log("");
    console.log(`Known clients: ${known}`);
}

/**
 * Main function
 * @returns {Promise<void>}
 */
async function main() {
    const argv = process.argv.slice(2);

    if (argv.includes("-h") || argv.includes("--help")) {
        printHelp();
        process.exit(0);
    }

    const noBackend = argv.includes("--no-backend");
    const { client } = parseClientFlag(argv);
    const resolved = resolveClient(client);
    const vitePorts = getVitePorts();
    const clientPort = vitePorts[0] ?? 5173;

    freePorts(vitePorts);

    let docsPort;

    if (!resolved.isDev) {
        const startFrom = vitePorts[1] ?? clientPort + 1;

        docsPort = await findFreePort(startFrom, [clientPort]);
    }

    const specs = buildProcessList(resolved, { clientPort, docsPort, noBackend });

    if (specs.length === 0) {
        console.error("No processes resolved for client.");
        process.exit(1);
    }

    const manager = new ProcessManager(specs);

    let exitCode = 0;
    let cleanupPromise = null;

    const cleanup = () => {
        if (!cleanupPromise) {
            cleanupPromise = manager.stopAll();
        }

        return cleanupPromise;
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
        for (const proc of manager.processes) {
            const pid = proc.child?.pid;

            if (!pid || (proc.status !== "running" && proc.status !== "starting")) {
                continue;
            }

            try {
                process.kill(-pid, "SIGKILL");
            } catch {
                try {
                    process.kill(pid, "SIGKILL");
                } catch {
                    // already gone
                }
            }
        }
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
