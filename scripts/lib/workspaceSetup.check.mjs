import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    applyWorkspaceChoices,
    clearRootWorkspace,
    copyWorkspaceToRoot,
    listWorkspaceEntries,
    resolveWorkspaceDir,
    saveWorkspaceFromRoot,
    WORKSPACE_MANIFEST,
    WIZARD_WORKSPACE_ENTRIES
} from "./workspaceSetup.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cht-workspace-"));
const root = path.join(tmp, "root");
const templates = path.join(root, "workspaces", "devApp");

fs.mkdirSync(path.join(templates, ".vscode"), { recursive: true });
fs.writeFileSync(path.join(templates, ".vscode", "settings.json"), "{\"opinionated\":true}\n");
fs.mkdirSync(path.join(templates, ".cursor"), { recursive: true });
fs.writeFileSync(path.join(templates, ".cursor", "README.md"), "cursor-base\n");
fs.mkdirSync(path.join(templates, ".claude"), { recursive: true });
fs.writeFileSync(path.join(templates, ".claude", "README.md"), "claude-from-cursor\n");
fs.writeFileSync(path.join(templates, ".prettierrc.json"), "{\"tabWidth\":4}\n");
fs.writeFileSync(path.join(templates, ".prettierignore"), "dist\n");
fs.writeFileSync(path.join(templates, "netlify.toml"), "[[redirects]]\n");
fs.writeFileSync(path.join(templates, "eslint.config.js"), "export default [];\n");
fs.writeFileSync(path.join(templates, ".env.example"), "PACK=1\n");
fs.writeFileSync(path.join(templates, "cspell.json"), "{\"words\":[\"cht\"]}\n");

assert(resolveWorkspaceDir("devApp", root) === templates, "devApp dir");
assert(resolveWorkspaceDir("dev", root) === templates, "dev alias");
assert(
    resolveWorkspaceDir("acme", root, () => "cht-client-acme") ===
        path.join(root, "cht-client-acme", "workspace"),
    "client workspace dir"
);
assert(
    resolveWorkspaceDir("ghost", root) === path.join(root, "workspaces", "ghost"),
    "unknown client falls back to workspaces/"
);

copyWorkspaceToRoot(templates, root);
assert(fs.readFileSync(path.join(root, ".vscode", "settings.json"), "utf8").includes("opinionated"), "copy vscode");
assert(fs.existsSync(path.join(root, ".cursor", "README.md")), "copy cursor");
assert(fs.existsSync(path.join(root, "netlify.toml")), "copy netlify");
assert(fs.existsSync(path.join(root, "eslint.config.js")), "copy eslint");
assert(fs.readFileSync(path.join(root, ".env.example"), "utf8").includes("PACK=1"), "copy extra env");
assert(fs.existsSync(path.join(root, "cspell.json")), "copy extra cspell");
assert(fs.existsSync(path.join(root, WORKSPACE_MANIFEST)), "copy writes manifest");
assert(listWorkspaceEntries(templates).includes(".env.example"), "pack lists extras");

const blank = path.join(tmp, "blank");
fs.mkdirSync(blank, { recursive: true });

applyWorkspaceChoices(blank, templates, {
    ide: "vscode",
    ideFlavor: "new",
    prettier: true,
    prettierFlavor: "new",
    eslint: true,
    eslintFlavor: "new",
    vps: true,
    vpsFlavor: "new",
    ai: "cursor",
    aiFlavor: "new"
});

assert(JSON.parse(fs.readFileSync(path.join(blank, ".vscode", "settings.json"), "utf8")).editor === undefined, "new vscode empty");
assert(JSON.parse(fs.readFileSync(path.join(blank, ".prettierrc.json"), "utf8")).tabWidth === undefined, "new prettier empty");
assert(fs.readFileSync(path.join(blank, "eslint.config.js"), "utf8").includes("export default []"), "new eslint empty");
assert(fs.existsSync(path.join(blank, "netlify.toml")), "new vps copies default netlify");
assert(fs.existsSync(path.join(blank, ".cursor")), "new cursor dir");
assert(!fs.existsSync(path.join(blank, ".claude")), "new cursor does not install claude");

const dirty = path.join(tmp, "dirty");
fs.mkdirSync(path.join(dirty, ".cursor"), { recursive: true });
fs.writeFileSync(path.join(dirty, ".cursor", "OLD.md"), "stale\n");
fs.writeFileSync(path.join(dirty, "netlify.toml"), "old-netlify\n");

fs.writeFileSync(path.join(dirty, "eslint.config.js"), "old-eslint\n");

applyWorkspaceChoices(dirty, templates, {
    ide: "vscode",
    ideFlavor: "new",
    prettier: false,
    eslint: false,
    vps: false,
    ai: "none"
});

assert(fs.existsSync(path.join(dirty, ".vscode", "settings.json")), "new keeps vscode");
assert(!fs.existsSync(path.join(dirty, ".cursor")), "--new clears leftover cursor");
assert(!fs.existsSync(path.join(dirty, "netlify.toml")), "--new clears leftover netlify");
assert(!fs.existsSync(path.join(dirty, "eslint.config.js")), "--new clears leftover eslint");

const opinionated = path.join(tmp, "op");
fs.mkdirSync(opinionated, { recursive: true });

applyWorkspaceChoices(opinionated, templates, {
    ide: "vscode",
    ideFlavor: "opinionated",
    prettier: true,
    prettierFlavor: "opinionated",
    eslint: true,
    eslintFlavor: "opinionated",
    vps: true,
    vpsFlavor: "opinionated",
    ai: "claude",
    aiFlavor: "opinionated"
});

assert(fs.readFileSync(path.join(opinionated, ".vscode", "settings.json"), "utf8").includes("opinionated"), "opinionated vscode");
assert(fs.readFileSync(path.join(opinionated, "eslint.config.js"), "utf8").includes("export default []"), "opinionated eslint");
assert(fs.readFileSync(path.join(opinionated, ".claude", "README.md"), "utf8").includes("claude-from-cursor"), "opinionated claude");
assert(!fs.existsSync(path.join(opinionated, ".cursor")), "claude choice skips root .cursor");

const both = path.join(tmp, "both-ai");
fs.mkdirSync(both, { recursive: true });

applyWorkspaceChoices(both, templates, {
    ide: "vscode",
    ideFlavor: "new",
    prettier: false,
    vps: false,
    ai: ["cursor", "claude"],
    aiFlavors: { cursor: "new", claude: "opinionated" }
});

assert(fs.existsSync(path.join(both, ".cursor")), "multi ai cursor");
assert(fs.readFileSync(path.join(both, ".claude", "README.md"), "utf8").includes("claude-from-cursor"), "multi ai claude opinionated");

const saveDest = path.join(tmp, "saved");
saveWorkspaceFromRoot(root, saveDest);
assert(fs.existsSync(path.join(saveDest, ".vscode", "settings.json")), "save vscode");
assert(fs.existsSync(path.join(saveDest, "netlify.toml")), "save netlify");
assert(fs.existsSync(path.join(saveDest, "eslint.config.js")), "save eslint");
assert(fs.existsSync(path.join(saveDest, ".env.example")), "save extra env");
assert(WIZARD_WORKSPACE_ENTRIES.includes(".claude"), "claude is a wizard entry");

const leftover = path.join(tmp, "leftover");
fs.mkdirSync(leftover, { recursive: true });
copyWorkspaceToRoot(templates, leftover);
assert(fs.existsSync(path.join(leftover, "cspell.json")), "leftover has extra");
clearRootWorkspace(leftover);
assert(!fs.existsSync(path.join(leftover, "cspell.json")), "clean removes extra via manifest");
assert(!fs.existsSync(path.join(leftover, ".vscode")), "clean removes wizard files");
assert(!fs.existsSync(path.join(leftover, WORKSPACE_MANIFEST)), "clean removes manifest");

fs.rmSync(tmp, { recursive: true, force: true });
console.log("workspaceSetup ok");
