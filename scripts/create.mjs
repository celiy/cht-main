import fs from "node:fs";
import path from "node:path";
import { spawnSyncInherit } from "./lib/runCommand.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, "..");
const TEMPLATE_DIR = path.join(ROOT_DIR, "cht-base", "template", "client-template");

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

function printUsage() {
    console.log("Usage: npx chtmain create <nome> <pasta>");
    console.log("");
    console.log("  nome   Identificador kebab-case (cht.config.json → name)");
    console.log("  pasta  Destino relativo ao cwd, ou caminho absoluto");
    console.log("");
    console.log("Se a pasta já existir, os ficheiros são copiados para dentro (o .git mantém-se).");
}

function toKebab(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toTitle(kebab) {
    return kebab
        .split("-")
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(" ");
}

function toPascal(kebab) {
    return kebab
        .split("-")
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join("");
}

function isTextFile(filePath) {
    const base = path.basename(filePath);

    if (base === ".gitignore") {
        return true;
    }

    const ext = path.extname(filePath);

    if (base.endsWith(".d.ts")) {
        return true;
    }

    return TEXT_EXT.has(ext);
}

function applyPlaceholders(content, tokens) {
    let next = content;

    for (const [key, value] of Object.entries(tokens)) {
        next = next.split(key).join(value);
    }

    return next;
}

function copyTemplate(fromDir, toDir, tokens) {
    fs.mkdirSync(toDir, { recursive: true });

    for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
        if (SKIP_NAMES.has(entry.name)) {
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

function main() {
    const args = process.argv.slice(2).filter((arg) => arg !== "--");

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

    if (!fs.existsSync(TEMPLATE_DIR)) {
        console.error(`Template em falta: ${TEMPLATE_DIR}`);
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

    copyTemplate(TEMPLATE_DIR, dest, tokens);

    console.log(existed ? `Ficheiros copiados para ${dest}` : `Cliente criado em ${dest}`);
    console.log(`name: ${tokens.__CLIENT_NAME__}`);

    if (fs.existsSync(path.join(dest, "package.json"))) {
        console.log(`[create] npm install in ${dest}`);
        const install = spawnSyncInherit("npm", ["install"], { cwd: dest });

        if (install.status !== 0) {
            console.warn("[create] npm install falhou; corre npm install na pasta do cliente.");
        }
    }

    console.log("Seguinte: npx chtmain sync-tsconfig && npx chtmain dev --client:" + kebab);
}

main();
