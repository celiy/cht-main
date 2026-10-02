const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const URL_REGEX = /\bhttps?:\/\/[^\s<>\u001B"']+/g;

export function stripAnsi(input) {
    if (!input) {
        return "";
    }

    return String(input).replace(ANSI_REGEX, "");
}

export function visibleLength(input) {
    return stripAnsi(input).length;
}

export function findUrls(input) {
    const cleaned = stripAnsi(input);
    const urls = [];

    for (const match of cleaned.matchAll(URL_REGEX)) {
        const idx = match.index ?? 0;

        if (idx > 0 && cleaned[idx - 1] === "=") {
            continue;
        }

        urls.push(match[0].replace(/[).,;:]+$/, ""));
    }

    return urls;
}

export function dedupeUrls(urls) {
    const seen = new Set();
    const out = [];

    for (const url of urls) {
        if (!seen.has(url)) {
            seen.add(url);
            out.push(url);
        }
    }

    return out;
}

/**
 * Unique http(s) URLs found in each process log, keeping tab order.
 *
 * @param {Array<{ id?: string, name: string, lines?: string[] }>} processes
 * @returns {Array<{ id: string, name: string, urls: string[] }>}
 */
export function urlsByProcess(processes) {
    const groups = [];

    for (const proc of processes ?? []) {
        const collected = [];

        for (const line of proc.lines ?? []) {
            collected.push(...findUrls(line));
        }

        const urls = dedupeUrls(collected);

        if (urls.length === 0) {
            continue;
        }

        groups.push({
            id: proc.id ?? proc.name,
            name: proc.name,
            urls
        });
    }

    return groups;
}

export function osc8Link(url, label) {
    const text = label || url;
    const ESC = "\x1B";

    return `${ESC}]8;;${url}${ESC}\\${text}${ESC}]8;;${ESC}\\`;
}

export function truncateVisible(input, max) {
    if (!input) {
        return "";
    }

    const visible = stripAnsi(input);

    if (visible.length <= max) {
        return input;
    }

    let count = 0;
    let result = "";
    let i = 0;

    while (i < input.length && count < max) {
        const ch = input[i];

        if (ch === "\x1B") {
            const matchAt = input.slice(i).match(/^\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/);

            if (matchAt) {
                result += matchAt[0];
                i += matchAt[0].length;

                continue;
            }
        }

        result += ch;
        count += 1;
        i += 1;
    }

    return result;
}
