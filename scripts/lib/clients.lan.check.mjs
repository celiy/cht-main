/**
 * Check: LAN vs loopback Vite host in the runner process list.
 * Run: node scripts/lib/clients.lan.check.mjs
 */
import assert from "node:assert/strict";
import { buildProcessList, viteDevHost } from "./clients.mjs";

assert.equal(viteDevHost(undefined), "0.0.0.0");
assert.equal(viteDevHost(true), "0.0.0.0");
assert.equal(viteDevHost(false), "127.0.0.1");

const frontend = {
    dir: "cht-base",
    cmd: "npm run dev:client",
    clientDir: "cht-client-x"
};

const lan = buildProcessList(
    {
        name: "x",
        isDev: false,
        siteTitle: "x",
        lan: true,
        frontend,
        backend: null
    },
    { clientPort: 5173, docsPort: 5174, noBackend: true }
);

assert.match(lan[0]?.cmd ?? "", /--host 0\.0\.0\.0/);
assert.match(lan[1]?.cmd ?? "", /--host 0\.0\.0\.0/);

const loopback = buildProcessList(
    {
        name: "x",
        isDev: false,
        siteTitle: "x",
        lan: false,
        frontend,
        backend: null
    },
    { clientPort: 5173, docsPort: 5174, noBackend: true }
);

assert.match(loopback[0]?.cmd ?? "", /--host 127\.0\.0\.1/);
assert.match(loopback[1]?.cmd ?? "", /--host 127\.0\.0\.1/);
assert.doesNotMatch(loopback[0]?.cmd ?? "", /--host 0\.0\.0\.0/);

console.log("clients.lan.check.mjs: ok");
