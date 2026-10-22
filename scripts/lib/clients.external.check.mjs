/**
 * Check: a client folder outside the workspace root, passed as a path argument.
 * Run: node scripts/lib/clients.external.check.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    getClientDir,
    listClientNames,
    listExternalClientDirs,
    parseClientFlag,
    parsePositionalClientArg,
    resolveClient
} from "./clients.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cht-external-client-"));

try {
    fs.writeFileSync(
        path.join(dir, "cht.config.json"),
        JSON.stringify({ name: "external-check", backend: { dir: "../external-api" } })
    );

    assert.equal(parsePositionalClientArg(["mecarvit"]), "mecarvit");
    assert.equal(parsePositionalClientArg([dir]), "external-check");
    assert.equal(parseClientFlag([`--client:${dir}`]).client, "external-check");

    assert.ok(listExternalClientDirs().includes(dir));
    assert.ok(process.env.CHT_CLIENT_DIRS?.split(path.delimiter).includes(dir));
    assert.ok(listClientNames().includes("external-check"));
    assert.equal(getClientDir("external-check"), dir);
    assert.equal(resolveClient("external-check").frontend.clientDir, dir);
    assert.equal(resolveClient("external-check").backend.dir, path.resolve(dir, "../external-api"));
    assert.throws(() => parsePositionalClientArg([path.join(dir, "missing")]), /No cht\.config/);
} finally {
    fs.rmSync(dir, { recursive: true, force: true });
}

console.log("clients.external.check: ok");
