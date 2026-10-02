import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    CORE_WORKSPACE_REPOS,
    compareWorkspaceVersions,
    parseVersionFileText,
    writeCoreVersionPins
} from "./version.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

const parsed = parseVersionFileText(`version 1.0.1
versionCheckUrl https://github.com/celiy/cht-main/blob/main/version
cht-shared 1.2.3
cht-base 1.0.1
cht-design-system 2.0.0
cht-client-mecarvit 9.9.9
`);

assert(parsed.version === "1.0.1", "own version");
assert(
    parsed.versionCheckUrl === "https://github.com/celiy/cht-main/blob/main/version",
    "check url"
);
assert(parsed.requirements["cht-shared"] === "1.2.3", "shared pin");
assert(parsed.requirements["cht-base"] === "1.0.1", "base pin");
assert(parsed.requirements["cht-design-system"] === "2.0.0", "ds pin");
assert(parsed.requirements["cht-client-mecarvit"] === undefined, "clients are not pins");
assert(
    CORE_WORKSPACE_REPOS.join(",") === "cht-shared,cht-base,cht-design-system",
    "core list"
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cht-version-"));

fs.writeFileSync(
    path.join(tmp, "version"),
    "version 1.0.1\ncht-shared 1.0.0\ncht-base 1.0.1\ncht-design-system 1.0.0\n"
);
fs.mkdirSync(path.join(tmp, "cht-shared"));
fs.writeFileSync(path.join(tmp, "cht-shared", "version"), "version 1.0.0\n");
fs.mkdirSync(path.join(tmp, "cht-base"));
fs.writeFileSync(path.join(tmp, "cht-base", "version"), "version 1.0.2\n");

const mismatches = compareWorkspaceVersions(tmp);
const byId = Object.fromEntries(mismatches.map((row) => [row.id, row]));

assert(byId["cht-shared"] === undefined, "matching shared is not a mismatch");
assert(byId["cht-base"]?.expected === "1.0.1", "base expected");
assert(byId["cht-base"]?.actual === "1.0.2", "base actual");
assert(byId["cht-design-system"]?.expected === "1.0.0", "ds expected");
assert(byId["cht-design-system"]?.actual === null, "missing ds version file");

fs.mkdirSync(path.join(tmp, "cht-design-system"));
fs.writeFileSync(path.join(tmp, "cht-design-system", "version"), "version 3.0.0\n");

const pins = {
    "cht-shared": "1.0.0",
    "cht-base": "1.0.2",
    "cht-design-system": "3.0.0"
};

writeCoreVersionPins(tmp, pins);

const after = parseVersionFileText(fs.readFileSync(path.join(tmp, "version"), "utf8"));

assert(after.version === "1.0.1", "main version line stays");
assert(after.requirements["cht-shared"] === "1.0.0", "shared pin synced");
assert(after.requirements["cht-base"] === "1.0.2", "base pin synced");
assert(after.requirements["cht-design-system"] === "3.0.0", "ds pin synced");
assert(compareWorkspaceVersions(tmp).length === 0, "pins match locals after write");

fs.rmSync(tmp, { recursive: true, force: true });

console.log("version.check.mjs ok");
