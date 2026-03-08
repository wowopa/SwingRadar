import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR KRX symbol source fetcher

Usage:
  node scripts/fetch-krx-symbols.mjs [--source-url <url> | --downloads-dir <dir>] [--pattern <substring>] [--output <csv-path>]

Environment:
  SWING_RADAR_KRX_SOURCE_URL
  SWING_RADAR_KRX_DOWNLOADS_DIR
  SWING_RADAR_KRX_DOWNLOAD_PATTERN
`);
}

function parseArgs(argv) {
  const options = {
    sourceUrl: process.env.SWING_RADAR_KRX_SOURCE_URL,
    downloadsDir: process.env.SWING_RADAR_KRX_DOWNLOADS_DIR,
    pattern: process.env.SWING_RADAR_KRX_DOWNLOAD_PATTERN ?? "전종목",
    output: path.join(projectRoot, "data", "raw", "krx-symbols-source.csv"),
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--source-url") {
      options.sourceUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--downloads-dir") {
      options.downloadsDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--pattern") {
      options.pattern = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.sourceUrl && !options.downloadsDir) {
    throw new Error("Either --source-url or --downloads-dir is required");
  }

  return options;
}

async function fetchFromUrl(sourceUrl, outputPath) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "swing-radar-krx-fetch/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download KRX CSV: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  await writeFile(outputPath, content, "utf8");
}

async function copyLatestFromDownloads(downloadsDir, pattern, outputPath) {
  const entries = await readdir(downloadsDir, { withFileTypes: true });
  const csvFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv") && entry.name.includes(pattern))
    .map((entry) => path.join(downloadsDir, entry.name));

  if (!csvFiles.length) {
    throw new Error(`No CSV files found in ${downloadsDir} with pattern "${pattern}"`);
  }

  const { stat } = await import("node:fs/promises");
  const filesWithStats = await Promise.all(
    csvFiles.map(async (filePath) => ({
      filePath,
      mtimeMs: (await stat(filePath)).mtimeMs
    }))
  );
  filesWithStats.sort((left, right) => right.mtimeMs - left.mtimeMs);

  await copyFile(filesWithStats[0].filePath, outputPath);
  return filesWithStats[0].filePath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputPath = path.resolve(options.output);
  await mkdir(path.dirname(outputPath), { recursive: true });

  if (options.sourceUrl) {
    await fetchFromUrl(options.sourceUrl, outputPath);
    console.log("KRX source fetched from URL.");
    console.log(`- sourceUrl: ${options.sourceUrl}`);
    console.log(`- output: ${outputPath}`);
    return;
  }

  const copiedFrom = await copyLatestFromDownloads(path.resolve(options.downloadsDir), options.pattern, outputPath);
  console.log("KRX source copied from downloads.");
  console.log(`- source: ${copiedFrom}`);
  console.log(`- output: ${outputPath}`);
}

main().catch((error) => {
  console.error("KRX source fetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
