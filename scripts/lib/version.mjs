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
