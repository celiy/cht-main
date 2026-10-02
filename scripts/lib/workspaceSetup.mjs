import fs from "node:fs";
import path from "node:path";

export const WORKSPACE_ENTRIES = [
    ".vscode",
    ".cursor",
    ".claude",
    ".prettierrc.json",
    ".prettierignore",
    "netlify.toml",
    "eslint.config.js"
];

export const OPINIONATED_WORKSPACE = "devApp";

/**
 * @param {string} name
 * @param {string} root
 * @param {(name: string) => string | null} [clientDir]
 * @returns {string}
 */
export function resolveWorkspaceDir(name, root, clientDir) {
    const id = String(name || "").trim();

    if (!id || id === "dev" || id === OPINIONATED_WORKSPACE) {
        return path.join(root, "workspaces", OPINIONATED_WORKSPACE);
    }

    if (typeof clientDir === "function") {
        const dir = clientDir(id);

        if (dir) {
            const base = path.isAbsolute(dir) ? dir : path.join(root, dir);

            return path.join(base, "workspace");
        }
    }

    return path.join(root, "workspaces", id);
}

function copyEntry(from, to) {
    if (!fs.existsSync(from)) {
        return;
    }

    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true, force: true });
}

/**
 * Remove IDE/prettier/VPS/AI files from a root (or workspace folder).
 *
 * @param {string} dir
 */
export function clearRootWorkspace(dir) {
    for (const entry of WORKSPACE_ENTRIES) {
        fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
}

/**
 * @param {string} fromDir
 * @param {string} toDir
 */
export function copyWorkspaceToRoot(fromDir, toDir) {
    if (!fs.existsSync(fromDir)) {
        throw new Error(`[install] workspace not found: ${fromDir}`);
    }

    clearRootWorkspace(toDir);

    for (const entry of WORKSPACE_ENTRIES) {
        copyEntry(path.join(fromDir, entry), path.join(toDir, entry));
    }
}

/**
 * @param {string} root
 * @param {string} destDir
 */
export function saveWorkspaceFromRoot(root, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    clearRootWorkspace(destDir);

    for (const entry of WORKSPACE_ENTRIES) {
        copyEntry(path.join(root, entry), path.join(destDir, entry));
    }
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`);
}

function applyIde(root, templatesDir, flavor) {
    if (flavor === "opinionated") {
        copyEntry(path.join(templatesDir, ".vscode"), path.join(root, ".vscode"));

        return;
    }

    writeJson(path.join(root, ".vscode", "settings.json"), {});
    writeJson(path.join(root, ".vscode", "extensions.json"), { recommendations: [] });
}

function applyPrettier(root, templatesDir, flavor) {
    if (flavor === "opinionated") {
        copyEntry(path.join(templatesDir, ".prettierrc.json"), path.join(root, ".prettierrc.json"));
        copyEntry(path.join(templatesDir, ".prettierignore"), path.join(root, ".prettierignore"));

        return;
    }

    writeJson(path.join(root, ".prettierrc.json"), {});
    fs.writeFileSync(path.join(root, ".prettierignore"), "node_modules\n");
}

function applyEslint(root, templatesDir, flavor) {
    if (flavor === "opinionated") {
        copyEntry(path.join(templatesDir, "eslint.config.js"), path.join(root, "eslint.config.js"));

        return;
    }

    fs.writeFileSync(path.join(root, "eslint.config.js"), "export default [];\n");
}

function applyVps(root, templatesDir) {
    copyEntry(path.join(templatesDir, "netlify.toml"), path.join(root, "netlify.toml"));
}

function applyAi(root, templatesDir, kind, flavor) {
    const name = kind === "claude" ? ".claude" : ".cursor";

    if (flavor === "opinionated") {
        copyEntry(path.join(templatesDir, name), path.join(root, name));

        return;
    }

    fs.mkdirSync(path.join(root, name), { recursive: true });
}

/**
 * @param {string} root
 * @param {string} templatesDir
 * @param {{
 *   ide?: "vscode" | "none",
 *   ideFlavor?: "new" | "opinionated",
 *   prettier?: boolean,
 *   prettierFlavor?: "new" | "opinionated",
 *   eslint?: boolean,
 *   eslintFlavor?: "new" | "opinionated",
 *   vps?: boolean,
 *   vpsFlavor?: "new" | "opinionated",
 *   ai?: "cursor" | "claude" | "none" | string[],
 *   aiFlavor?: "new" | "opinionated",
 *   aiFlavors?: { cursor?: "new" | "opinionated", claude?: "new" | "opinionated" }
 * }} choices
 */
export function applyWorkspaceChoices(root, templatesDir, choices) {
    fs.mkdirSync(root, { recursive: true });
    clearRootWorkspace(root);

    if (choices.ide === "vscode") {
        applyIde(root, templatesDir, choices.ideFlavor);
    }

    if (choices.prettier) {
        applyPrettier(root, templatesDir, choices.prettierFlavor);
    }

    if (choices.eslint) {
        applyEslint(root, templatesDir, choices.eslintFlavor);
    }

    if (choices.vps) {
        applyVps(root, templatesDir);
    }

    const aiKinds = Array.isArray(choices.ai)
        ? choices.ai
        : choices.ai === "cursor" || choices.ai === "claude"
            ? [choices.ai]
            : [];

    for (const kind of aiKinds) {
        const flavor = choices.aiFlavors?.[kind] ?? choices.aiFlavor;

        applyAi(root, templatesDir, kind, flavor);
    }
}
