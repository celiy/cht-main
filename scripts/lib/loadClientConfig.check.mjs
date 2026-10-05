/**
 * Check: cht.config.ts / json loader (TS wins, .env in the module).
 * Run: node scripts/lib/loadClientConfig.check.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    clearClientConfigLoadCache,
    findClientConfigPath,
    loadClientConfigFromDir
} from "./loadClientConfig.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cht-client-config-"));

try {
    const jsonDir = path.join(tmp, "json-only");
    fs.mkdirSync(jsonDir);
    fs.writeFileSync(
        path.join(jsonDir, "cht.config.json"),
        JSON.stringify({ name: "from-json", siteTitle: "JSON" })
    );

    const jsonLoaded = loadClientConfigFromDir(jsonDir);
    assert.equal(jsonLoaded.config.name, "from-json");
    assert.equal(path.basename(jsonLoaded.configPath), "cht.config.json");

    const tsDir = path.join(tmp, "ts-and-json");
    fs.mkdirSync(tsDir);
    fs.writeFileSync(
        path.join(tsDir, "cht.config.json"),
        JSON.stringify({ name: "from-json", api: { dev: "http://json.example" } })
    );
    fs.writeFileSync(
        path.join(tsDir, ".env"),
        "CHT_API_DEV=http://127.0.0.1:3001\n"
    );
    fs.writeFileSync(
        path.join(tsDir, "cht.config.ts"),
        `
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of fs.readFileSync(path.join(dir, ".env"), "utf8").split(/\\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

export default {
    name: "from-ts",
    api: { dev: env.CHT_API_DEV }
};
`
    );

    clearClientConfigLoadCache();
    assert.equal(path.basename(findClientConfigPath(tsDir) ?? ""), "cht.config.ts");

    const tsLoaded = loadClientConfigFromDir(tsDir);
    assert.equal(tsLoaded.config.name, "from-ts");
    assert.equal(tsLoaded.config.api.dev, "http://127.0.0.1:3001");
    assert.equal(path.basename(tsLoaded.configPath), "cht.config.ts");

    console.log("loadClientConfig.check.mjs: ok");
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
