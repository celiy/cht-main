import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettierSync from "@prettier/sync";
import tsParser from "@typescript-eslint/parser";
import { parseForESLint } from "vue-eslint-parser";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ATTRS = {
    DEFINITION: "DEFINITION",
    LIST_RENDERING: "LIST_RENDERING",
    CONDITIONALS: "CONDITIONALS",
    RENDER_MODIFIERS: "RENDER_MODIFIERS",
    GLOBAL: "GLOBAL",
    UNIQUE: "UNIQUE",
    SLOT: "SLOT",
    TWO_WAY_BINDING: "TWO_WAY_BINDING",
    OTHER_DIRECTIVES: "OTHER_DIRECTIVES",
    ATTR_STATIC: "ATTR_STATIC",
    ATTR_DYNAMIC: "ATTR_DYNAMIC",
    ATTR_SHORTHAND_BOOL: "ATTR_SHORTHAND_BOOL",
    EVENTS: "EVENTS",
    CONTENT: "CONTENT"
};

const STRUCTURAL_TYPES = new Set([
    ATTRS.DEFINITION,
    ATTRS.LIST_RENDERING,
    ATTRS.CONDITIONALS,
    ATTRS.RENDER_MODIFIERS,
    ATTRS.UNIQUE,
    ATTRS.SLOT
]);

const STATIC_TYPES = new Set([ATTRS.GLOBAL, ATTRS.ATTR_STATIC, ATTRS.ATTR_SHORTHAND_BOOL]);

const EVENTS_TYPE = ATTRS.EVENTS;

/**
 * @param {import("eslint-plugin-vue/lib/utils").VAttribute | import("eslint-plugin-vue/lib/utils").VDirective} attribute
 */
function isVBind(attribute) {
    return Boolean(attribute.directive && attribute.key.name.name === "bind");
}

/**
 * @param {import("eslint-plugin-vue/lib/utils").VAttribute | import("eslint-plugin-vue/lib/utils").VDirective} attribute
 */
function isVShorthandBoolean(attribute) {
    return Boolean(!attribute.directive && !attribute.value);
}

/**
 * @param {import("eslint-plugin-vue/lib/utils").VAttribute | import("eslint-plugin-vue/lib/utils").VDirective} attribute
 */
function isClassOrStyleAttribute(attribute) {
    if (!attribute.directive) {
        const name = attribute.key.name;

        return name === "class" || name === "style";
    }

    if (!isVBind(attribute)) {
        return false;
    }

    if (!attribute.key.argument || attribute.key.argument.type !== "VIdentifier") {
        return false;
    }

    const name = attribute.key.argument.rawName;

    return name === "class" || name === "style";
}

/**
 * @param {import("eslint-plugin-vue/lib/utils").VAttribute | import("eslint-plugin-vue/lib/utils").VDirective} attribute
 */
function getAttributeType(attribute) {
    let propName;

    if (attribute.directive) {
        if (!isVBind(attribute)) {
            switch (attribute.key.name.name) {
                case "for":
                    return ATTRS.LIST_RENDERING;
                case "if":
                case "else-if":
                case "else":
                case "show":
                case "cloak":
                    return ATTRS.CONDITIONALS;
                case "pre":
                case "once":
                    return ATTRS.RENDER_MODIFIERS;
                case "model":
                    return ATTRS.TWO_WAY_BINDING;
                case "on":
                    return ATTRS.EVENTS;
                case "html":
                case "text":
                    return ATTRS.CONTENT;
                case "slot":
                    return ATTRS.SLOT;
                case "is":
                    return ATTRS.DEFINITION;
                default:
                    return ATTRS.OTHER_DIRECTIVES;
            }
        }

        propName =
            attribute.key.argument && attribute.key.argument.type === "VIdentifier"
                ? attribute.key.argument.rawName
                : "";
    } else {
        propName = attribute.key.name;
    }

    switch (propName) {
        case "is":
            return ATTRS.DEFINITION;
        case "id":
            return ATTRS.GLOBAL;
        case "ref":
        case "key":
            return ATTRS.UNIQUE;
        case "slot":
        case "slot-scope":
            return ATTRS.SLOT;
        default:
            if (isVBind(attribute)) {
                return ATTRS.ATTR_DYNAMIC;
            }

            if (isVShorthandBoolean(attribute)) {
                return ATTRS.ATTR_SHORTHAND_BOOL;
            }

            return ATTRS.ATTR_STATIC;
    }
}

/**
 * @param {import("eslint-plugin-vue/lib/utils").VAttribute | import("eslint-plugin-vue/lib/utils").VDirective} attribute
 */
function getAttributeGroup(attribute) {
    if (isClassOrStyleAttribute(attribute)) {
        return "styling";
    }

    const type = getAttributeType(attribute);

    if (STRUCTURAL_TYPES.has(type)) {
        return "structural";
    }

    if (type === EVENTS_TYPE) {
        return "events";
    }

    if (STATIC_TYPES.has(type)) {
        return "static";
    }

    return "dynamic";
}

/**
 * @param {string} prevGroup
 * @param {string} nextGroup
 */
function shouldSeparateGroups(prevGroup, nextGroup) {
    if (prevGroup === nextGroup) {
        return false;
    }

    if (nextGroup === "events") {
        return true;
    }

    if (prevGroup === "structural") {
        return true;
    }

    return false;
}

/**
 * @param {string} text
 */
function hasBlankLineBetween(text) {
    return /\n[\t ]*\n/.test(text);
}

const ATTRIBUTE_INDENT_WIDTH = 4;

/**
 * @param {import("eslint-plugin-vue/lib/utils").VStartTag} startTag
 * @param {string} source
 */
function getAttributeIndent(startTag, source) {
    const tagStart = startTag.range[0];
    const tagLineStart = source.lastIndexOf("\n", tagStart - 1) + 1;
    const tagLineIndent = source.slice(tagLineStart, tagStart).match(/^[\t ]*/)?.[0] ?? "";
    const firstAttribute = startTag.attributes[0];

    if (firstAttribute) {
        const beforeFirstAttribute = source.slice(tagStart, firstAttribute.range[0]);

        if (beforeFirstAttribute.includes("\n")) {
            const attributeLineStart = source.lastIndexOf("\n", firstAttribute.range[0] - 1) + 1;

            return (
                source.slice(attributeLineStart, firstAttribute.range[0]).match(/^[\t ]*/)?.[0] ??
                tagLineIndent + " ".repeat(ATTRIBUTE_INDENT_WIDTH)
            );
        }
    }

    return tagLineIndent + " ".repeat(ATTRIBUTE_INDENT_WIDTH);
}

/**
 * @param {import("eslint-plugin-vue/lib/utils").VStartTag} startTag
 * @param {string} source
 */
function collectStartTagReplacements(startTag, source) {
    /** @type {Array<{ start: number, end: number, replacement: string }>} */
    const replacements = [];
    const attributes = startTag.attributes;
    const attributeIndent = getAttributeIndent(startTag, source);

    if (attributes.length < 2) {
        return replacements;
    }

    for (let index = 1; index < attributes.length; index++) {
        const previous = attributes[index - 1];
        const current = attributes[index];
        const previousGroup = getAttributeGroup(previous);
        const currentGroup = getAttributeGroup(current);

        if (!shouldSeparateGroups(previousGroup, currentGroup)) {
            continue;
        }

        const betweenStart = previous.range[1];
        const betweenEnd = current.range[0];
        const betweenText = source.slice(betweenStart, betweenEnd);
        const currentLineStart = source.lastIndexOf("\n", current.range[0] - 1) + 1;
        const actualIndent = source.slice(currentLineStart, current.range[0]);

        if (!hasBlankLineBetween(betweenText)) {
            replacements.push({
                start: betweenStart,
                end: betweenEnd,
                replacement: `\n\n${attributeIndent}`
            });

            continue;
        }

        if (actualIndent !== attributeIndent) {
            replacements.push({
                start: currentLineStart,
                end: current.range[0],
                replacement: attributeIndent
            });
        }
    }

    return replacements;
}

/**
 * @param {import("vue-eslint-parser/ast").VElement | import("vue-eslint-parser/ast").VDocumentFragment | null | undefined} templateBody
 */
function collectTemplateStartTags(templateBody) {
    /** @type {import("eslint-plugin-vue/lib/utils").VStartTag[]} */
    const startTags = [];

    /**
     * @param {import("vue-eslint-parser/ast").VElement | import("vue-eslint-parser/ast").VDocumentFragment | import("vue-eslint-parser/ast").VStartTag | null | undefined} node
     */
    function visit(node) {
        if (!node) {
            return;
        }

        if (node.type === "VStartTag") {
            startTags.push(node);

            return;
        }

        if (node.type === "VElement") {
            visit(node.startTag);

            for (const child of node.children ?? []) {
                visit(child);
            }
        }

        if (node.type === "VDocumentFragment") {
            for (const child of node.children ?? []) {
                visit(child);
            }
        }
    }

    visit(templateBody);

    return startTags;
}

/**
 * @param {string} source
 * @param {string} filename
 */
export function insertAttributeGroupNewlines(source, filename) {
    const { ast } = parseForESLint(source, {
        filePath: filename,
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
        }
    });

    if (!ast.templateBody) {
        return source;
    }

    const replacements = collectTemplateStartTags(ast.templateBody).flatMap((startTag) =>
        collectStartTagReplacements(startTag, source)
    );

    if (replacements.length === 0) {
        return source;
    }

    replacements.sort((left, right) => right.start - left.start);

    let result = source;

    for (const replacement of replacements) {
        result =
            result.slice(0, replacement.start) +
            replacement.replacement +
            result.slice(replacement.end);
    }

    return result;
}

/**
 * @param {string} source
 * @param {string} filename
 */
export function formatVueFile(source, filename) {
    const absolutePath = path.isAbsolute(filename) ? filename : path.resolve(repoRoot, filename);
    const prettierOptions = {
        ...(prettierSync.resolveConfig(absolutePath) ?? {}),
        filepath: absolutePath
    };
    const formatted = prettierSync.format(source, prettierOptions);

    return insertAttributeGroupNewlines(formatted, absolutePath);
}

export const vueAttributeGroupNewlines = {
    meta: {
        type: "layout",
        docs: {
            description:
                "Format Vue SFCs with Prettier and blank lines between template attribute groups"
        },
        fixable: "code",
        schema: [],
        messages: {
            formatVueFile: "Vue file is not formatted according to project conventions."
        }
    },

    /**
     * @param {import("eslint").Rule.RuleContext} context
     */
    create(context) {
        const filename = context.filename ?? context.getFilename();

        if (!filename.endsWith(".vue")) {
            return {};
        }

        return {
            "Program:exit"(node) {
                const sourceCode = context.sourceCode;
                const original = sourceCode.getText();

                let expected;

                try {
                    expected = formatVueFile(original, filename);
                } catch {
                    return;
                }

                if (expected === original) {
                    return;
                }

                context.report({
                    node,
                    messageId: "formatVueFile",
                    fix(fixer) {
                        return fixer.replaceTextRange([0, original.length], expected);
                    }
                });
            }
        };
    }
};

export const chtVueRulesPlugin = {
    rules: {
        "vue-attribute-group-newlines": vueAttributeGroupNewlines
    }
};
