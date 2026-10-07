import fs from "node:fs";
import path from "node:path";
import { AI_SOURCE_DIR, AI_TARGET_IDS, aiEntryNames, generateAiDocs } from "./aiDocs.mjs";

export const WIZARD_WORKSPACE_ENTRIES = [
    ".vscode",
    ".cursor",
    ".claude",
    "CLAUDE.md",
    ".github",
    ".prettierrc.json",
    ".prettierignore",
    "netlify.toml",
    "eslint.config.js"
];

/** @deprecated use WIZARD_WORKSPACE_ENTRIES; wizard-only names */
export const WORKSPACE_ENTRIES = WIZARD_WORKSPACE_ENTRIES;

export const WORKSPACE_MANIFEST = ".cht-workspace.json";

export const OPINIONATED_WORKSPACE = "devApp";

/** AI targets generated from a pack's `ai/` folder by `--workspace:<name>`. */
const PACK_AI_TARGETS = ["cursor", "claude"];

const WORKSPACE_SKIP = new Set([
    ".git",
    ".gitkeep",
    "node_modules",
    WORKSPACE_MANIFEST,
    AI_SOURCE_DIR,
    "package.json",
    "package-lock.json",
    "README.md",
    "CONTRIBUTING.md",
    "AGENTS.md",
    "clients.json",
    "common-dependencies.json",
    "todo.txt",
    "version",
    "THIRD_PARTY_NOTICES.md",
    ".gitignore",
    ".gitattributes",
    "scripts",
    "workspaces",
    "builds",
    "eslint-rules",
    "prettier-plugins"
]);

/**
 * Top-level names in a pack (any file or folder except orchestrator/skip).
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function listWorkspaceEntries(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs
        .readdirSync(dir, { withFileTypes: true })
        .map((entry) => entry.name)
        .filter((name) => !WORKSPACE_SKIP.has(name) && !name.startsWith("cht-"));
}

function readManifest(dir) {
    const filePath = path.join(dir, WORKSPACE_MANIFEST);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const entries = parsed?.entries;

        return Array.isArray(entries) ? entries.filter((name) => typeof name === "string") : [];
    } catch {
        return [];
    }
}

function writeManifest(dir, names) {
    fs.writeFileSync(
        path.join(dir, WORKSPACE_MANIFEST),
        `${JSON.stringify({ entries: names }, null, 4)}\n`
    );
}

function namesToClear(dir, extraNames = []) {
    return [...new Set([...WIZARD_WORKSPACE_ENTRIES, ...readManifest(dir), ...extraNames])];
}

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
 * Remove whatever the last pack/wizard put on `dir` (manifest + wizard names).
 *
 * @param {string} dir
 * @param {string[]} [extraNames]
 */
export function clearRootWorkspace(dir, extraNames = []) {
    for (const entry of namesToClear(dir, extraNames)) {
        if (WORKSPACE_SKIP.has(entry)) {
            continue;
        }

        fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }

    fs.rmSync(path.join(dir, WORKSPACE_MANIFEST), { force: true });
}

/**
 * Copy every pack entry (not only wizard names) onto `toDir`.
 *
 * @param {string} fromDir
 * @param {string} toDir
 */
export function copyWorkspaceToRoot(fromDir, toDir) {
    if (!fs.existsSync(fromDir)) {
        throw new Error(`[install] workspace not found: ${fromDir}`);
    }

    const aiDir = path.join(fromDir, AI_SOURCE_DIR);
    const aiTargets = fs.existsSync(aiDir) ? PACK_AI_TARGETS : [];
    const entries = [
        ...new Set([...listWorkspaceEntries(fromDir), ...aiTargets.flatMap(aiEntryNames)])
    ];

    clearRootWorkspace(toDir, entries);
    fs.mkdirSync(toDir, { recursive: true });

    for (const entry of entries) {
        copyEntry(path.join(fromDir, entry), path.join(toDir, entry));
    }

    for (const kind of aiTargets) {
        generateAiDocs(aiDir, toDir, kind);
    }

    writeManifest(toDir, entries);
}

/**
 * @param {string} root
 * @param {string} destDir
 */
export function saveWorkspaceFromRoot(root, destDir) {
    const fromManifest = readManifest(root);
    const entries = fromManifest.length
        ? fromManifest
        : WIZARD_WORKSPACE_ENTRIES.filter((entry) => fs.existsSync(path.join(root, entry)));

    fs.mkdirSync(destDir, { recursive: true });
    clearRootWorkspace(destDir, entries);

    for (const entry of entries) {
        copyEntry(path.join(root, entry), path.join(destDir, entry));
    }

    writeManifest(destDir, entries);
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
    if (flavor === "opinionated") {
        generateAiDocs(path.join(templatesDir, AI_SOURCE_DIR), root, kind);

        return;
    }

    fs.mkdirSync(path.join(root, aiEntryNames(kind)[0]), { recursive: true });
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
 *   ai?: "cursor" | "claude" | "copilot" | "none" | string[],
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
        : AI_TARGET_IDS.includes(choices.ai)
            ? [choices.ai]
            : [];

    for (const kind of aiKinds) {
        const flavor = choices.aiFlavors?.[kind] ?? choices.aiFlavor;

        applyAi(root, templatesDir, kind, flavor);
    }

    writeManifest(
        root,
        WIZARD_WORKSPACE_ENTRIES.filter((entry) => fs.existsSync(path.join(root, entry)))
    );
}
