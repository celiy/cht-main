import fs from "node:fs";
import { render } from "ink";
import { App } from "./App.jsx";

/**
 * Parse the arguments
 * @param {string[]} argv The arguments.
 * @returns {Object} The parsed arguments (out, targets).
 */
function parseArgs(argv) {
    let out = "";
    let targets = [];

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--out") {
            out = argv[i + 1] || "";
            i += 1;
        } else if (arg.startsWith("--out=")) {
            out = arg.slice("--out=".length);
        } else if (arg === "--targets") {
            targets = String(argv[i + 1] || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            i += 1;
        } else if (arg.startsWith("--targets=")) {
            targets = arg
                .slice("--targets=".length)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    return { out, targets };
}

/**
 * Main function
 * @returns {Promise<void>}
 */
async function main() {
    const { out, targets } = parseArgs(process.argv.slice(2));

    if (!out) {
        console.error("workspace-tui: --out <file> is required");
        process.exit(1);
    }

    let payload = { cancel: true };

    const { waitUntilExit } = render(
        <App
            saveTargets={targets}
            onFinish={(result) => {
                payload = result;
            }}
        />,
        { exitOnCtrlC: false }
    );

    await waitUntilExit();
    fs.writeFileSync(out, `${JSON.stringify(payload)}\n`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
