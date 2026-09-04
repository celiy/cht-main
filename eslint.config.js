import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/builds/**",
            "**/out/**",
            "**/*.d.ts"
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/recommended"],
    {
        files: ["**/*.{js,ts,vue}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            curly: ["error", "all"],
            "vue/multi-word-component-names": "off",
            "vue/no-reserved-component-names": "off",
            "vue/require-default-prop": "off",
            "vue/valid-template-root": "off",
            "vue/no-v-html": "off",
            "vue/no-required-prop-with-default": "off",
            "vue/no-template-shadow": "off",
            "vue/no-unused-components": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-this-alias": "off",
            "vue/attributes-order": [
                "error",
                {
                    order: [
                        "DEFINITION",
                        "LIST_RENDERING",
                        "CONDITIONALS",
                        "RENDER_MODIFIERS",
                        "GLOBAL",
                        ["UNIQUE", "SLOT"],
                        "TWO_WAY_BINDING",
                        "OTHER_DIRECTIVES",
                        "OTHER_ATTR",
                        "EVENTS",
                        "CONTENT"
                    ],
                    alphabetical: false
                }
            ]
        }
    },
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser
            }
        }
    },
    eslintConfigPrettier
);
