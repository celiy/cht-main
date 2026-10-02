import { urlsByProcess } from "./ansiUtils.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

const groups = urlsByProcess([
    {
        id: "front-end",
        name: "front-end",
        lines: [
            "npm notice run 'cross-env' CLIENT=mecarvit CHT_DEVAPP_URL=http://127.0.0.1:5174 npm run dev:client -- --port 5173 --host 127.0.0.1",
            "ready http://127.0.0.1:5173/"
        ]
    },
    {
        id: "docs",
        name: "docs",
        lines: ["Local: http://127.0.0.1:5174"]
    },
    {
        id: "back-end",
        name: "back-end",
        lines: ["listening on http://127.0.0.1:3001"]
    },
    {
        id: "quiet",
        name: "quiet",
        lines: ["no urls here"]
    }
]);

assert(groups.length === 3, "skip empty");
assert(groups[0].name === "front-end" && groups[0].urls.length === 1, "dedupe per tab");
assert(groups[0].urls[0] === "http://127.0.0.1:5173/", "front-end url");
assert(groups[1].urls[0] === "http://127.0.0.1:5174", "docs url");
assert(groups[2].urls[0] === "http://127.0.0.1:3001", "back-end url");

console.log("ansiUtils urlsByProcess ok");
