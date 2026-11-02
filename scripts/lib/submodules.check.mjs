/**
 * Self-check: .gitmodules config output is parsed into submodules.
 * Run: node scripts/lib/submodules.check.mjs
 */
import assert from "node:assert/strict";
import { parseGitmodulesConfig } from "./submodules.mjs";

const parsed = parseGitmodulesConfig(
    [
        "submodule.cht-base.path cht-base",
        "submodule.cht-base.branch beta",
        "submodule.cht-shared.path cht-shared",
        "submodule.dotted.name.path libs/x",
        "submodule.orphan.branch main",
        ""
    ].join("\n")
);

assert.deepEqual(parsed, [
    { name: "cht-base", path: "cht-base", branch: "beta" },
    { name: "cht-shared", path: "cht-shared" },
    { name: "dotted.name", path: "libs/x" }
]);
assert.deepEqual(parseGitmodulesConfig(""), []);

console.log("submodules.check: ok");
