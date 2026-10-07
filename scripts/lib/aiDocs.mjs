import fs from "node:fs";
import path from "node:path";

/** Folder inside a pack that holds the agent-neutral rules, commands, skills and docs. */
export const AI_SOURCE_DIR = "ai";

const TEXT_EXTENSIONS = new Set([".md", ".py", ".sh"]);
const SKIP_NAMES = new Set(["__pycache__"]);

/**
 * One entry per agent/IDE. `frontmatter` receives the parsed rule and returns the
 * `key: value` lines the tool expects (an empty array means no frontmatter).
 */
const TARGETS = {
    cursor: {
        dir: ".cursor",
        rulesDir: "rules",
        ruleFile: (name) => `${name}.mdc`,
        commandsDir: "commands",
        commandFile: (name) => `${name}.md`,
        rootFiles: {},
        frontmatter: (rule) => {
            const lines = [];

            if (rule.description) {
                lines.push(`description: ${JSON.stringify(rule.description)}`);
            }

            if (rule.globs.length > 0) {
                lines.push(`globs: ${JSON.stringify(rule.globs.join(","))}`);
            }

            lines.push(`alwaysApply: ${rule.alwaysApply}`);

            return lines;
        }
    },
    claude: {
        dir: ".claude",
        rulesDir: "rules",
        ruleFile: (name) => `${name}.md`,
        commandsDir: "commands",
        commandFile: (name) => `${name}.md`,
        rootFiles: { "CLAUDE.md": "@AGENTS.md\n" },
        frontmatter: (rule) => {
            if (rule.alwaysApply || rule.globs.length === 0) {
                return [];
            }

            return ["paths:", ...rule.globs.map((glob) => `  - ${JSON.stringify(glob)}`)];
        }
    },
    copilot: {
        dir: ".github",
        rulesDir: "instructions",
        ruleFile: (name) => `${name}.instructions.md`,
        commandsDir: "prompts",
        commandFile: (name) => `${name}.prompt.md`,
        rootFiles: {},
        frontmatter: (rule) => {
            const lines = [];

            if (rule.description) {
                lines.push(`description: ${JSON.stringify(rule.description)}`);
            }

            if (rule.alwaysApply) {
                lines.push("applyTo: \"**\"");
            } else if (rule.globs.length > 0) {
                lines.push(`applyTo: ${JSON.stringify(rule.globs.join(","))}`);
            }

            return lines;
        }
    }
};

export const AI_TARGET_IDS = Object.keys(TARGETS);

/**
 * Top-level names a target writes at the workspace root.
 *
 * @param {string} kind
 * @returns {string[]}
 */
export function aiEntryNames(kind) {
    const target = TARGETS[kind];

    return target ? [target.dir, ...Object.keys(target.rootFiles)] : [];
}

function splitGlobs(value) {
    const globs = [];
    let depth = 0;
    let current = "";

    for (const char of value) {
        if (char === "{") {
            depth += 1;
        } else if (char === "}") {
            depth -= 1;
        }

        if (char === "," && depth === 0) {
            globs.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    globs.push(current.trim());

    return globs.filter(Boolean);
}

function parseRule(text) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const meta = {};

    if (match) {
        for (const line of (match[1] ?? "").split(/\r?\n/)) {
            const pair = line.match(/^(\w+):\s*(.*)$/);

            if (pair) {
                meta[pair[1]] = (pair[2] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
            }
        }
    }

    return {
        description: meta.description ?? "",
        globs: splitGlobs(meta.globs ?? ""),
        alwaysApply: meta.alwaysApply === "true",
        body: match ? text.slice(match[0].length) : text
    };
}

function render(text, target) {
    return text
        .replace(
            /\{\{aiDir\}\}\/rules\/([\w-]+)\.md/g,
            (_, name) => `${target.dir}/${target.rulesDir}/${target.ruleFile(name)}`
        )
        .replace(/\{\{rule:([\w-]+)\}\}/g, (_, name) => target.ruleFile(name))
        .replace(/\{\{rulesDir\}\}/g, target.rulesDir)
        .replace(/\{\{aiDir\}\}/g, target.dir);
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function copyTree(from, to, target, rename = (name) => name) {
    if (!fs.existsSync(from)) {
        return;
    }

    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        if (SKIP_NAMES.has(entry.name) || entry.name.endsWith(".pyc")) {
            continue;
        }

        const source = path.join(from, entry.name);

        if (entry.isDirectory()) {
            copyTree(source, path.join(to, entry.name), target);
        } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
            writeFile(path.join(to, rename(entry.name)), render(fs.readFileSync(source, "utf8"), target));
            fs.chmodSync(path.join(to, rename(entry.name)), fs.statSync(source).mode);
        } else {
            fs.mkdirSync(to, { recursive: true });
            fs.copyFileSync(source, path.join(to, entry.name));
        }
    }
}

/**
 * Convert the agent-neutral docs in `srcDir` to the layout one agent/IDE reads.
 *
 * @param {string} srcDir Pack `ai/` folder.
 * @param {string} root Workspace root to write into.
 * @param {string} kind One of `AI_TARGET_IDS`.
 * @returns {string[]} Top-level names written.
 */
export function generateAiDocs(srcDir, root, kind) {
    const target = TARGETS[kind];

    if (!target) {
        throw new Error(`[install] unknown AI target: ${kind}`);
    }

    if (!fs.existsSync(srcDir)) {
        throw new Error(`[install] AI docs source not found: ${srcDir}`);
    }

    const outDir = path.join(root, target.dir);

    fs.mkdirSync(outDir, { recursive: true });

    const rulesFrom = path.join(srcDir, "rules");

    if (fs.existsSync(rulesFrom)) {
        for (const file of fs.readdirSync(rulesFrom).filter((name) => name.endsWith(".md"))) {
            const rule = parseRule(fs.readFileSync(path.join(rulesFrom, file), "utf8"));
            const lines = target.frontmatter(rule);
            const header = lines.length > 0 ? `---\n${lines.join("\n")}\n---\n` : "";
            const name = file.slice(0, -".md".length);

            writeFile(
                path.join(outDir, target.rulesDir, target.ruleFile(name)),
                render(`${header}${rule.body}`, target)
            );
        }
    }

    copyTree(
        path.join(srcDir, "commands"),
        path.join(outDir, target.commandsDir),
        target,
        (name) => target.commandFile(name.slice(0, -path.extname(name).length))
    );
    copyTree(path.join(srcDir, "skills"), path.join(outDir, "skills"), target);
    copyTree(path.join(srcDir, "docs"), path.join(outDir, "docs"), target);

    for (const [name, content] of Object.entries(target.rootFiles)) {
        writeFile(path.join(root, name), content);
    }

    return aiEntryNames(kind);
}
