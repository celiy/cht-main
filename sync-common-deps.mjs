#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const BASE_FILE_NAME = "common-dependencies.json";
const BASE_FILE_PATH = path.join(ROOT_DIR, BASE_FILE_NAME);
const LEGACY_BASE_FILE_PATH = path.join(ROOT_DIR, ".cursor", BASE_FILE_NAME);
const DEP_SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function stripRangePrefix(version) {
  if (typeof version !== "string") return "";
  return version.replace(/^[~^<>=\s]*/, "").trim();
}

function normalizeSemverLike(version) {
  const cleaned = stripRangePrefix(version).match(/\d+\.\d+\.\d+/);
  return cleaned ? cleaned[0] : null;
}

function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function listRepoDirectories(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(rootDir, entry.name))
    .filter((dirPath) => fs.existsSync(path.join(dirPath, "package.json")));
}

function collectDependencyData(packageJsonFiles) {
  const packageMap = new Map();

  for (const packageJsonPath of packageJsonFiles) {
    const packageJson = readJson(packageJsonPath);
    const repoName = path.basename(path.dirname(packageJsonPath));

    for (const section of DEP_SECTIONS) {
      const deps = packageJson[section];
      if (!deps || typeof deps !== "object") continue;

      for (const [depName, depVersion] of Object.entries(deps)) {
        if (!packageMap.has(depName)) {
          packageMap.set(depName, []);
        }
        packageMap.get(depName).push({
          repoName,
          section,
          version: String(depVersion),
          semver: normalizeSemverLike(String(depVersion)),
        });
      }
    }
  }

  return packageMap;
}

function chooseLatestVersion(entries) {
  let selected = entries[0];
  let selectedSemver = selected.semver;

  for (const entry of entries.slice(1)) {
    if (!selectedSemver && entry.semver) {
      selected = entry;
      selectedSemver = entry.semver;
      continue;
    }

    if (selectedSemver && entry.semver) {
      if (compareSemver(entry.semver, selectedSemver) > 0) {
        selected = entry;
        selectedSemver = entry.semver;
      }
      continue;
    }
  }

  return selected.version;
}

function buildCommonDependenciesFile(packageMap) {
  const commonDependencies = {};

  for (const [depName, entries] of packageMap.entries()) {
    const reposUsingPackage = new Set(entries.map((entry) => entry.repoName));
    if (reposUsingPackage.size < 2) continue;
    commonDependencies[depName] = chooseLatestVersion(entries);
  }

  const sorted = Object.fromEntries(
    Object.entries(commonDependencies).sort(([a], [b]) => a.localeCompare(b)),
  );

  return {
    generatedAt: new Date().toISOString(),
    description:
      "Shared dependencies across repositories. This file is the source of truth for version normalization.",
    dependencies: sorted,
  };
}

function applyVersionNormalization(packageJsonFiles, baseDependencies) {
  let updatedFiles = 0;
  let updatedPackages = 0;

  for (const packageJsonPath of packageJsonFiles) {
    const packageJson = readJson(packageJsonPath);
    let fileChanged = false;

    for (const section of DEP_SECTIONS) {
      const deps = packageJson[section];
      if (!deps || typeof deps !== "object") continue;

      for (const [depName, depVersion] of Object.entries(baseDependencies)) {
        if (depName in deps && deps[depName] !== depVersion) {
          deps[depName] = depVersion;
          updatedPackages += 1;
          fileChanged = true;
        }
      }
    }

    if (fileChanged) {
      writeJson(packageJsonPath, packageJson);
      updatedFiles += 1;
    }
  }

  return { updatedFiles, updatedPackages };
}

function ensureBaseFile(packageMap, baseFilePath) {
  if (!fs.existsSync(baseFilePath) && fs.existsSync(LEGACY_BASE_FILE_PATH)) {
    const legacy = readJson(LEGACY_BASE_FILE_PATH);
    writeJson(baseFilePath, legacy);
    console.log(
      `Legacy base file migrated from ${LEGACY_BASE_FILE_PATH} to ${baseFilePath}`,
    );
  }

  if (fs.existsSync(baseFilePath)) {
    const existing = readJson(baseFilePath);
    if (!existing?.dependencies || typeof existing.dependencies !== "object") {
      throw new Error(
        `Invalid base file at ${baseFilePath}. Expected: { "dependencies": { ... } }`,
      );
    }
    return { created: false, data: existing };
  }

  const generated = buildCommonDependenciesFile(packageMap);
  writeJson(baseFilePath, generated);
  return { created: true, data: generated };
}

function main() {
  const repoDirs = listRepoDirectories(ROOT_DIR);
  const packageJsonFiles = repoDirs.map((repoDir) => path.join(repoDir, "package.json"));

  if (packageJsonFiles.length === 0) {
    console.error("No package.json files found in sub-repositories.");
    process.exit(1);
  }

  const packageMap = collectDependencyData(packageJsonFiles);
  const { created, data } = ensureBaseFile(packageMap, BASE_FILE_PATH);
  const baseDependencies = data.dependencies;

  const { updatedFiles, updatedPackages } = applyVersionNormalization(
    packageJsonFiles,
    baseDependencies,
  );

  if (created) {
    console.log(`Base file created: ${BASE_FILE_PATH}`);
  } else {
    console.log(`Using existing base file: ${BASE_FILE_PATH}`);
  }

  console.log(`Base dependencies: ${Object.keys(baseDependencies).length}`);
  console.log(`Updated package.json files: ${updatedFiles}`);
  console.log(`Normalized versions: ${updatedPackages}`);
}

main();
