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
    const matches = cleaned.match(URL_REGEX);

    if (!matches) {
        return [];
    }

    return matches.map((u) => u.replace(/[).,;:]+$/, ""));
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
