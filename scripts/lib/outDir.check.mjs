/**
 * Check: `build --out` refuses folders that hold source, and accepts plain export folders.
 * Run: node scripts/lib/outDir.check.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findUnsafeOutDir } from "./outDir.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "chtmain-outdir-"));
const client = path.join(root, "my-client");
const external = path.join(root, "elsewhere", "other-client");
const clients = [client, external];

fs.mkdirSync(client, { recursive: true });
fs.mkdirSync(path.join(external, ".git"), { recursive: true });
fs.mkdirSync(path.join(root, "plain-repo", ".git"), { recursive: true });
fs.mkdirSync(path.join(root, "undiscovered"), { recursive: true });
fs.writeFileSync(path.join(root, "undiscovered", "cht.config.json"), "{}");

const refused = [
    root,
    path.dirname(root),
    os.homedir(),
    client,
    path.dirname(external),
    path.join(root, "cht-base"),
    path.join(root, "cht-base", "dist"),
    path.join(root, "scripts", "lib"),
    path.join(root, "plain-repo"),
    path.join(root, "undiscovered")
];

for (const dir of refused) {
    assert.ok(findUnsafeOutDir(dir, root, clients), `should refuse ${dir}`);
}

const accepted = [
    path.join(root, "builds", "my-client", "dist"),
    path.join(client, "dist"),
    path.join(root, "release"),
    path.join(os.tmpdir(), "chtmain-outdir-export")
];

for (const dir of accepted) {
    assert.equal(findUnsafeOutDir(dir, root, clients), null, `should accept ${dir}`);
}

fs.rmSync(root, { recursive: true, force: true });
console.log("outDir.check: ok");
