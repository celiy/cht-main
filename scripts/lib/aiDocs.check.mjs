import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { aiEntryNames, generateAiDocs } from "./aiDocs.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

function read(...parts) {
    return fs.readFileSync(path.join(...parts), "utf8");
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cht-ai-docs-"));
const src = path.join(tmp, "ai");
const write = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(src, rel)), { recursive: true });
    fs.writeFileSync(path.join(src, rel), content);
};

write("rules/always.md", "---\ndescription: \"Always: on\"\nalwaysApply: true\n---\n\nBody {{rule:scoped}}\n");
write("rules/scoped.md", "---\ndescription: Scoped\nglobs: \"**/*.{vue,ts},docs/*.md\"\nalwaysApply: false\n---\n\nSee {{aiDir}}/rules/always.md in {{aiDir}}\n");
write("rules/bare.md", "# No frontmatter\n");
write("commands/go.md", "---\ndescription: Go\n---\n\nRead {{aiDir}}/skills/s/SKILL.md\n");
write("skills/s/SKILL.md", "---\nname: s\n---\nRun {{aiDir}}/skills/s/scripts/x.sh\n");
write("skills/s/scripts/x.sh", "#!/bin/sh\necho {{aiDir}}\n");
write("skills/s/scripts/__pycache__/x.pyc", "junk");
write("skills/s/data/t.csv", "a,{{aiDir}}\n");
write("docs/d.md", "[a](../{{rulesDir}}/{{rule:always}})\n");
fs.chmodSync(path.join(src, "skills/s/scripts/x.sh"), 0o755);

const cursor = path.join(tmp, "cursor");
assert(generateAiDocs(src, cursor, "cursor").join() === ".cursor", "cursor names");
assert(read(cursor, ".cursor/rules/always.mdc").startsWith("---\ndescription: \"Always: on\"\nalwaysApply: true\n---\n"), "cursor always");
assert(read(cursor, ".cursor/rules/always.mdc").includes("Body scoped.mdc"), "cursor rule ref");
assert(read(cursor, ".cursor/rules/scoped.mdc").includes("globs: \"**/*.{vue,ts},docs/*.md\""), "cursor globs");
assert(read(cursor, ".cursor/rules/scoped.mdc").includes("See .cursor/rules/always.mdc in .cursor"), "cursor paths");
assert(read(cursor, ".cursor/rules/bare.mdc").includes("alwaysApply: false"), "cursor bare");
assert(read(cursor, ".cursor/commands/go.md").includes(".cursor/skills/s/SKILL.md"), "cursor command");
assert(read(cursor, ".cursor/skills/s/scripts/x.sh").includes("echo .cursor"), "script rendered");
assert(fs.statSync(path.join(cursor, ".cursor/skills/s/scripts/x.sh")).mode & 0o111, "script stays executable");
assert(!fs.existsSync(path.join(cursor, ".cursor/skills/s/scripts/__pycache__")), "pycache skipped");
assert(read(cursor, ".cursor/skills/s/data/t.csv").includes("{{aiDir}}"), "data copied raw");

const claude = path.join(tmp, "claude");
assert(generateAiDocs(src, claude, "claude").join() === ".claude,CLAUDE.md", "claude names");
assert(!read(claude, ".claude/rules/always.md").startsWith("---"), "claude always has no frontmatter");
assert(read(claude, ".claude/rules/scoped.md").startsWith("---\npaths:\n  - \"**/*.{vue,ts}\"\n  - \"docs/*.md\"\n---\n"), "claude paths split outside braces");
assert(read(claude, "CLAUDE.md") === "@AGENTS.md\n", "claude entry file");

const copilot = path.join(tmp, "copilot");
generateAiDocs(src, copilot, "copilot");
assert(read(copilot, ".github/instructions/always.instructions.md").includes("applyTo: \"**\""), "copilot always");
assert(read(copilot, ".github/instructions/scoped.instructions.md").includes("applyTo: \"**/*.{vue,ts},docs/*.md\""), "copilot globs");
assert(read(copilot, ".github/prompts/go.prompt.md").includes(".github/skills/s/SKILL.md"), "copilot prompt");
assert(read(copilot, ".github/docs/d.md").includes("../instructions/always.instructions.md"), "copilot doc link");

assert(aiEntryNames("nope").length === 0, "unknown target has no entries");

let threw = false;

try {
    generateAiDocs(path.join(tmp, "missing"), copilot, "cursor");
} catch {
    threw = true;
}

assert(threw, "missing source throws");

fs.rmSync(tmp, { recursive: true, force: true });
console.log("aiDocs ok");
