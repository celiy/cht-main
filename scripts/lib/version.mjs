import fs from "node:fs";
import path from "node:path";

/**
 * Version files are plain text with a `version` line, e.g.:
 *
 *   version 1.0.3
 *   versionCheckUrl https://github.com/celiy/cht-client-mecarvit/blob/main/version
 *
 * `VERSION_LINE_PATTERN` only matches the `version` line: the `versionCheckUrl`
 * line fails because `[:\s=]+` cannot match its `C`.
 */
export const VERSION_FILE_CANDIDATES = ["version", "version.json", "version.txt"];
export const VERSION_LINE_PATTERN = /^(\s*version[:\s=]+)(\d+\.\d+\.\d+)\s*$/im;
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
export const CORE_WORKSPACE_REPOS = ["cht-shared", "cht-base", "cht-design-system"];
const CORE_WORKSPACE_REPO_SET = new Set(CORE_WORKSPACE_REPOS);
const PIN_LINE_PATTERN = /^(cht-[a-z0-9-]+)[:\s=]+(\d+\.\d+\.\d+)\s*$/i;

/**
 * Rollover limits: the major number is unbounded, while minor and patch wrap
 * to zero once they would exceed the limit.
 *
 *   1.1.1   -> 1.1.2
 *   1.1.10  -> 1.2.0
 *   5.10.10 -> 6.0.0
 */
export const VERSION_PART_LIMITS = {
    minor: 10,
    patch: 10
};

export function parseVersion(value) {
    const normalized = String(value ?? "").trim();

    if (!VERSION_PATTERN.test(normalized)) {
        return null;
    }

    const [major, minor, patch] = normalized.split(".").map(Number);

    return { major, minor, patch };
}

/**
 * Increment the patch number, carrying over into minor and major when a part
 * exceeds its limit.
 *
 * @param {string} version Version in `x.y.z` form.
 * @returns {string | null} Bumped version, or null when the input is invalid.
 */
export function nextVersion(version) {
    const parsed = parseVersion(version);

    if (!parsed) {
        return null;
    }

    let { major, minor, patch } = parsed;

    patch += 1;

    if (patch > VERSION_PART_LIMITS.patch) {
        patch = 0;
        minor += 1;
    }

    if (minor > VERSION_PART_LIMITS.minor) {
        minor = 0;
        major += 1;
    }

    return `${major}.${minor}.${patch}`;
}

export function findVersionFile(dir) {
    for (const name of VERSION_FILE_CANDIDATES) {
        const filePath = path.join(dir, name);

        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }

    return null;
}

/**
 * Read the declared version from a directory's version file.
 *
 * @param {string} dir Repository root.
 * @returns {{ version: string, filePath: string } | null}
 */
export function readVersion(dir) {
    const filePath = findVersionFile(dir);

    if (!filePath) {
        return null;
    }

    let raw;

    try {
        raw = fs.readFileSync(filePath, "utf8");
    } catch {
        return null;
    }

    if (path.extname(filePath) === ".json") {
        try {
            const parsed = JSON.parse(raw);
            const version = String(parsed?.version ?? "").trim();

            return VERSION_PATTERN.test(version) ? { version, filePath } : null;
        } catch {
            return null;
        }
    }

    const match = raw.match(VERSION_LINE_PATTERN);

    return match?.[2] ? { version: match[2].trim(), filePath } : null;
}

/**
 * Parse a version file body: own `version`, optional `versionCheckUrl`,
 * and `cht-* x.y.z` pins for core workspace repos only.
 *
 * @param {string} raw File contents.
 * @returns {{ version: string | null, versionCheckUrl: string | null, requirements: Record<string, string> }}
 */
export function parseVersionFileText(raw) {
    const requirements = {};
    let version = null;
    let versionCheckUrl = null;
    const text = String(raw ?? "");

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#") || line.startsWith("//")) {
            continue;
        }

        const versionMatch = line.match(VERSION_LINE_PATTERN);

        if (versionMatch?.[2] && !/^versionCheckUrl/i.test(line)) {
            version = versionMatch[2].trim();
            continue;
        }

        const urlMatch = line.match(/^versionCheckUrl[:\s=]+(.+)$/i);

        if (urlMatch?.[1]) {
            versionCheckUrl = urlMatch[1].trim();
            continue;
        }

        const pinMatch = line.match(PIN_LINE_PATTERN);
        const repo = pinMatch?.[1]?.toLowerCase();
        const pin = pinMatch?.[2];

        if (repo && pin && CORE_WORKSPACE_REPO_SET.has(repo)) {
            requirements[repo] = pin;
        }
    }

    return { version, versionCheckUrl, requirements };
}

/**
 * Compare cht-main version pins against each core repo's local `version` file.
 *
 * @param {string} root Workspace root (`cht-main`).
 * @returns {Array<{ id: string, name: string, expected: string, actual: string | null }>}
 */
export function compareWorkspaceVersions(root) {
    const mainFile = findVersionFile(root);
    const mismatches = [];

    if (!mainFile) {
        return mismatches;
    }

    let raw;

    try {
        raw = fs.readFileSync(mainFile, "utf8");
    } catch {
        return mismatches;
    }

    const { requirements } = parseVersionFileText(raw);

    for (const repo of CORE_WORKSPACE_REPOS) {
        const expected = requirements[repo];

        if (!expected) {
            continue;
        }

        const local = readVersion(path.join(root, repo));
        const actual = local?.version ?? null;

        if (actual === expected) {
            continue;
        }

        mismatches.push({
            id: repo,
            name: repo,
            expected,
            actual
        });
    }

    return mismatches;
}

/**
 * Resolve a repo directory from its name without the `cht-` prefix, so callers
 * pass `client-mecarvit` and `base` instead of `cht-client-mecarvit`.
 *
 * @param {string} root Workspace root.
 * @param {string} repo Repo name without the `cht-` prefix (`main` for the root).
 * @returns {string} Absolute repository directory.
 */
export function resolveRepoDir(root, repo) {
    const name = String(repo ?? "").trim();
    const candidates = [];

    if (name === "main" || name === "cht-main") {
        return root;
    }

    if (name.startsWith("cht-")) {
        candidates.push(path.resolve(root, name));
    } else {
        candidates.push(path.resolve(root, `cht-${name}`));
    }

    return candidates[0];
}

export function listBumpableRepos(root) {
    const names = [];

    if (findVersionFile(root)) {
        names.push("main");
    }

    if (!fs.existsSync(root)) {
        return names;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith("cht-")) {
            continue;
        }

        const dir = path.join(root, entry.name);

        if (findVersionFile(dir)) {
            names.push(entry.name.slice("cht-".length));
        }
    }

    return names.sort();
}

/**
 * Bump the version declared in a repository's version file, preserving every
 * other line. The file is written; nothing is committed to git.
 *
 * @param {string} dir Repository root.
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ from: string, to: string, filePath: string, written: boolean }}
 */
export function bumpVersionDir(dir, options = {}) {
    const current = readVersion(dir);

    if (!current) {
        throw new Error(`No version file found in ${dir}.`);
    }

    const next = nextVersion(current.version);

    if (!next) {
        throw new Error(`Invalid version "${current.version}" in ${current.filePath}.`);
    }

    const result = {
        from: current.version,
        to: next,
        filePath: current.filePath,
        written: false
    };

    if (options.dryRun) {
        return result;
    }

    const raw = fs.readFileSync(current.filePath, "utf8");
    const updated = raw.replace(VERSION_LINE_PATTERN, (_match, prefix) => `${prefix}${next}`);

    if (updated === raw) {
        throw new Error(`Could not update the version line in ${current.filePath}.`);
    }

    fs.writeFileSync(current.filePath, updated, "utf8");
    result.written = true;

    return result;
}

/**
 * Read each core repo's local `version` (throws if a core folder has none).
 *
 * @param {string} root Workspace root.
 * @returns {Record<string, string>}
 */
export function readCoreLocalVersions(root) {
    const pins = {};

    for (const repo of CORE_WORKSPACE_REPOS) {
        const local = readVersion(path.join(root, repo));

        if (!local) {
            throw new Error(`No version file for ${repo} in ${path.join(root, repo)}.`);
        }

        pins[repo] = local.version;
    }

    return pins;
}

/**
 * Write `cht-* x.y.z` pin lines in the workspace `version` file from local
 * core versions. Leaves the workspace's own `version` line untouched.
 *
 * @param {string} root Workspace root.
 * @param {Record<string, string>} pins
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ filePath: string, written: boolean, changed: boolean }}
 */
export function writeCoreVersionPins(root, pins, options = {}) {
    const filePath = findVersionFile(root);

    if (!filePath) {
        throw new Error(`No version file found in ${root}.`);
    }

    let raw = fs.readFileSync(filePath, "utf8");
    const original = raw;

    for (const repo of CORE_WORKSPACE_REPOS) {
        const version = pins[repo];

        if (!version || !VERSION_PATTERN.test(version)) {
            continue;
        }

        const escaped = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const linePattern = new RegExp(`^(${escaped}[:\\s=]+)\\d+\\.\\d+\\.\\d+\\s*$`, "im");

        if (linePattern.test(raw)) {
            raw = raw.replace(linePattern, `$1${version}`);
        } else {
            raw = `${raw.replace(/\s*$/, "")}\n${repo} ${version}\n`;
        }
    }

    const changed = raw !== original;

    if (options.dryRun || !changed) {
        return { filePath, written: false, changed };
    }

    fs.writeFileSync(filePath, raw, "utf8");

    return { filePath, written: true, changed };
}
