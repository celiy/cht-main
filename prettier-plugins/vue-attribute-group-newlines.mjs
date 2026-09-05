import { createRequire } from "node:module";
import { insertAttributeGroupNewlines } from "../eslint-rules/vue-attribute-group-newlines.mjs";

const require = createRequire(import.meta.url);
const { hardline, join } = require("prettier").doc.builders;

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
 * @param {import("prettier").Config | null | undefined} config
 */
function getInnerFormatPlugins(config) {
    return (config?.plugins ?? []).filter((entry) => !isAttributeGroupPlugin(entry));
}

/**
 * @param {import("prettier").Config | null | undefined} config
 * @param {import("prettier").ParserOptions} options
 */
function getInnerFormatOptions(config, options) {
    return {
        semi: config?.semi ?? options.semi,
        singleQuote: config?.singleQuote ?? options.singleQuote,
        tabWidth: config?.tabWidth ?? options.tabWidth,
        useTabs: config?.useTabs ?? options.useTabs,
        trailingComma: config?.trailingComma ?? options.trailingComma,
        printWidth: config?.printWidth ?? options.printWidth,
        singleAttributePerLine: config?.singleAttributePerLine ?? options.singleAttributePerLine,
        tailwindStylesheet: config?.tailwindStylesheet ?? options.tailwindStylesheet,
        plugins: getInnerFormatPlugins(config)
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
                const filepath = options.filepath ?? options.physicalFilepath;
                const resolvedConfig =
                    typeof filepath === "string"
                        ? await prettier.resolveConfig(filepath)
                        : null;
                const formatted = await prettier.format(text, {
                    ...getInnerFormatOptions(resolvedConfig, options),
                    parser: "vue",
                    filepath
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
