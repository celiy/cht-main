import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncInherit } from "./lib/runCommand.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, "..");
const TEMPLATES_ROOT = path.join(ROOT_DIR, "cht-base", "template");
const DEFAULT_TEMPLATE_DIR = path.join(TEMPLATES_ROOT, "client-template");

const SKIP_NAMES = new Set(["node_modules", ".git", "package-lock.json"]);

const TEXT_EXT = new Set([
    ".ts",
    ".vue",
    ".json",
    ".md",
    ".css",
    ".html",
    ".txt",
    ".d.ts"
]);

/**
 * Print the usage
 * @returns {void}
 */
function printUsage() {
    console.log("Usage: npx chtmain create <nome> <pasta> [--template:<template>]");
    console.log("");
    console.log("  nome        Identificador kebab-case (cht.config.ts / cht.config.json → name)");
    console.log("  pasta       Destino relativo ao cwd, ou caminho absoluto");
    console.log(
        `  --template  Um de: ${listTemplates().join(", ") || "(nenhum)"}. Sem a flag, usa o template padrão.`
    );
    console.log("");
    console.log("Se a pasta já existir, os ficheiros são copiados para dentro (o .git mantém-se).");
}

/**
 * List the optional templates (`cht-base/template/client-<name>`, except the default)
 * @returns {string[]} The template names.
 */
function listTemplates() {
    if (!fs.existsSync(TEMPLATES_ROOT)) {
        return [];
    }

    return fs
        .readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isDirectory() &&
                entry.name.startsWith("client-") &&
                entry.name !== "client-template"
        )
        .map((entry) => entry.name.slice("client-".length));
}

/**
 * Convert a value to kebab case
 * @param {string} value The value to convert.
 * @returns {string} The kebab case value.
 */
function toKebab(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Convert a value to title case
 * @param {string} kebab The kebab case value.
 * @returns {string} The title case value.
 */
function toTitle(kebab) {
    return kebab
        .split("-")
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(" ");
}

/**
 * Convert a value to pascal case
 * @param {string} kebab The kebab case value.
 * @returns {string} The pascal case value.
 */
function toPascal(kebab) {
    return kebab
        .split("-")
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join("");
}

/**
 * Check if a file is a text file
 * @param {string} filePath The file path.
 * @returns {boolean} Whether the file is a text file.
 */
function isTextFile(filePath) {
    const base = path.basename(filePath);

    if (base === ".gitignore" || base === ".env.example") {
        return true;
    }

    const ext = path.extname(filePath);

    if (base.endsWith(".d.ts")) {
        return true;
    }

    return TEXT_EXT.has(ext);
}

/**
 * Apply placeholders to a content
 * @param {string} content The content to apply the placeholders to.
 * @param {Record<string, string>} tokens The tokens to apply.
 * @returns {string} The content with the placeholders applied.
 */
function applyPlaceholders(content, tokens) {
    let next = content;

    for (const [key, value] of Object.entries(tokens)) {
        next = next.split(key).join(value);
    }

    return next;
}

/**
 * Copy a template
 * @param {string} fromDir The source directory.
 * @param {string} toDir The destination directory.
 * @param {Record<string, string>} tokens The tokens to apply.
 * @returns {void}
 */
function copyTemplate(fromDir, toDir, tokens) {
    fs.mkdirSync(toDir, { recursive: true });

    for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
        if (SKIP_NAMES.has(entry.name)) {
            continue;
        }

        if (entry.name === ".env") {
            continue;
        }

        const fromPath = path.join(fromDir, entry.name);
        const toPath = path.join(toDir, entry.name);

        if (entry.isDirectory()) {
            copyTemplate(fromPath, toPath, tokens);
            continue;
        }

        if (isTextFile(fromPath)) {
            const raw = fs.readFileSync(fromPath, "utf8");
            fs.writeFileSync(toPath, applyPlaceholders(raw, tokens), "utf8");
            continue;
        }

        fs.copyFileSync(fromPath, toPath);
    }
}

/**
 * Main function
 * @returns {Promise<void>}
 */
function main() {
    const argv = process.argv.slice(2).filter((arg) => arg !== "--");
    const templateArg = argv.find((arg) => arg.startsWith("--template:"));
    const args = argv.filter((arg) => arg !== templateArg);

    if (args.includes("-h") || args.includes("--help") || args.length < 2) {
        printUsage();
        process.exit(args.length < 2 ? 1 : 0);
    }

    const kebab = toKebab(args[0]);
    const folderArg = args[1];

    if (!kebab) {
        console.error("Nome inválido. Usa letras, números e hífen.");
        process.exit(1);
    }

    if (!folderArg) {
        printUsage();
        process.exit(1);
    }

    const templateName = templateArg ? templateArg.slice("--template:".length) : "";

    if (templateArg && !listTemplates().includes(templateName)) {
        console.error(
            `Template desconhecido: "${templateName}". Disponíveis: ${listTemplates().join(", ")}`
        );
        process.exit(1);
    }

    const templateDir = templateName
        ? path.join(TEMPLATES_ROOT, `client-${templateName}`)
        : DEFAULT_TEMPLATE_DIR;

    if (!fs.existsSync(templateDir)) {
        console.error(`Template em falta: ${templateDir}`);
        process.exit(1);
    }

    const dest = path.resolve(process.cwd(), folderArg);
    const existed = fs.existsSync(dest);

    if (existed && !fs.statSync(dest).isDirectory()) {
        console.error(`O destino existe e não é uma pasta: ${dest}`);
        process.exit(1);
    }

    const tokens = {
        __CLIENT_NAME__: kebab,
        __PACKAGE_NAME__: `cht-client-${kebab}`,
        __SITE_TITLE__: toTitle(kebab),
        __APP_NAME__: `${toPascal(kebab)}App`.replace(/AppApp$/, "App")
    };

    copyTemplate(templateDir, dest, tokens);

    console.log(existed ? `Ficheiros copiados para ${dest}` : `Cliente criado em ${dest}`);
    console.log(`name: ${tokens.__CLIENT_NAME__}`);

    if (fs.existsSync(path.join(dest, "package.json"))) {
        console.log(`[create] npm install in ${dest}`);
        const install = spawnSyncInherit("npm", ["install"], { cwd: dest });

        if (install.status !== 0) {
            console.warn("[create] npm install falhou; corre npm install na pasta do cliente.");
        }
    }

    const inRoot = path.dirname(dest) === ROOT_DIR;
    const target = inRoot ? kebab : path.relative(ROOT_DIR, dest) || ".";

    console.log("Seguinte: npx chtmain dev " + target);
}

main();
