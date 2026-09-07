import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { insertAttributeGroupNewlines } from "../eslint-rules/vue-attribute-group-newlines.mjs";

const require = createRequire(import.meta.url);
const { hardline, join } = require("prettier").doc.builders;
const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(pluginDir, "..");
const tailwindPluginPath = require.resolve("prettier-plugin-tailwindcss");
const defaultTailwindStylesheet = path.resolve(projectRoot, "cht-base/src/css/style.prettier.css");

/** @type {import("prettier").Plugin | null} */
let cachedTailwindPlugin = null;

/**
 * @param {unknown} entry
 */
function isAttributeGroupPlugin(entry) {
    if (typeof entry === "string") {
        return entry.includes("vue-attribute-group-newlines");
    }

    return entry?.name === "prettier-plugin-vue-attribute-group-newlines";
}

/**
 * @param {string} filepath
 */
function isVirtualEditorFilepath(filepath) {
    return filepath.includes("noop.js");
}

/**
 * @param {import("prettier").ParserOptions} options
 */
function getFormatFilepath(options) {
    const candidates = [options.physicalFilepath, options.filepath];

    for (const candidate of candidates) {
        if (typeof candidate === "string" && !isVirtualEditorFilepath(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

async function getTailwindPlugin() {
    if (cachedTailwindPlugin) {
        return cachedTailwindPlugin;
    }

    const mod = await import(pathToFileURL(tailwindPluginPath).href);

    cachedTailwindPlugin = mod.default ?? mod;

    return cachedTailwindPlugin;
}

/**
 * @param {import("prettier").Config | null | undefined} config
 * @param {import("prettier").ParserOptions} options
 */
function getInnerFormatOptions(config, options) {
    const tailwindStylesheet = config?.tailwindStylesheet ?? options.tailwindStylesheet;
    const resolvedTailwindStylesheet =
        typeof tailwindStylesheet === "string" && tailwindStylesheet.startsWith(".")
            ? path.resolve(projectRoot, tailwindStylesheet)
            : tailwindStylesheet ?? defaultTailwindStylesheet;

    return {
        semi: config?.semi ?? options.semi,
        singleQuote: config?.singleQuote ?? options.singleQuote,
        tabWidth: config?.tabWidth ?? options.tabWidth,
        useTabs: config?.useTabs ?? options.useTabs,
        trailingComma: config?.trailingComma ?? options.trailingComma,
        printWidth: config?.printWidth ?? options.printWidth,
        singleAttributePerLine: config?.singleAttributePerLine ?? options.singleAttributePerLine,
        tailwindStylesheet: resolvedTailwindStylesheet
    };
}

/** @type {import("prettier").Plugin} */
const plugin = {
    name: "prettier-plugin-vue-attribute-group-newlines",

    languages: [
        {
            name: "Vue",
            type: "markup",
            extensions: [".vue"],
            parsers: ["vue-attribute-group-newlines"],
            vscodeLanguageIds: ["vue"]
        }
    ],

    parsers: {
        "vue-attribute-group-newlines": {
            astFormat: "vue-attribute-group-newlines",
            locStart: () => 0,
            locEnd: (node) => node.value.length,

            /**
             * @param {string} text
             * @param {Record<string, import("prettier").Parser<any>>} _parsers
             * @param {import("prettier").ParserOptions} options
             */
            async parse(text, _parsers, options) {
                const prettier = await import("prettier");
                const filepath = getFormatFilepath(options);
                const resolvedConfig =
                    typeof filepath === "string"
                        ? await prettier.resolveConfig(filepath)
                        : null;
                const tailwindPlugin = await getTailwindPlugin();
                const formatted = await prettier.format(text, {
                    ...getInnerFormatOptions(resolvedConfig, options),
                    parser: "vue",
                    plugins: [tailwindPlugin],
                    ...(typeof filepath === "string" ? { filepath } : {})
                });
                const value =
                    typeof filepath === "string"
                        ? insertAttributeGroupNewlines(formatted, filepath)
                        : formatted;

                return {
                    type: "VueAttributeGroupNewlinesRoot",
                    value
                };
            }
        }
    },

    printers: {
        "vue-attribute-group-newlines": {
            /**
             * @param {import("prettier").AstPath<{ value: string }>} path
             */
            print(path) {
                const lines = path.node.value.split("\n");

                return join(hardline, lines);
            }
        }
    }
};

export default plugin;
