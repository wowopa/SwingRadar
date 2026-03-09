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
  node scripts/fetch-krx-symbols.mjs [--source-url <url> | --downloads-dir <dir> | --api] [--pattern <substring>] [--output <csv-path>]

Environment:
  SWING_RADAR_KRX_FETCH_MODE=downloads | url | api
  SWING_RADAR_KRX_SOURCE_URL
  SWING_RADAR_KRX_DOWNLOADS_DIR
  SWING_RADAR_KRX_DOWNLOAD_PATTERN
  SWING_RADAR_KRX_API_URL
  SWING_RADAR_KRX_API_KEY
  SWING_RADAR_KRX_API_AUTH_HEADER
  SWING_RADAR_KRX_API_METHOD
  SWING_RADAR_KRX_API_RESPONSE_TYPE=csv | json
  SWING_RADAR_KRX_API_DATA_PATH=data
  SWING_RADAR_KRX_API_FIELD_TICKER=ticker
  SWING_RADAR_KRX_API_FIELD_COMPANY=company
  SWING_RADAR_KRX_API_FIELD_MARKET=market
  SWING_RADAR_KRX_API_FIELD_SECTOR=sector
  SWING_RADAR_KRX_API_FIELD_DART=dartCorpCode
`);
}

function parseArgs(argv) {
  const options = {
    fetchMode: process.env.SWING_RADAR_KRX_FETCH_MODE,
    sourceUrl: process.env.SWING_RADAR_KRX_SOURCE_URL,
    downloadsDir: process.env.SWING_RADAR_KRX_DOWNLOADS_DIR,
    pattern: process.env.SWING_RADAR_KRX_DOWNLOAD_PATTERN ?? "KRX",
    apiUrl: process.env.SWING_RADAR_KRX_API_URL,
    apiKey: process.env.SWING_RADAR_KRX_API_KEY,
    apiAuthHeader: process.env.SWING_RADAR_KRX_API_AUTH_HEADER ?? "Authorization",
    apiMethod: process.env.SWING_RADAR_KRX_API_METHOD ?? "GET",
    apiResponseType: process.env.SWING_RADAR_KRX_API_RESPONSE_TYPE ?? "csv",
    apiDataPath: process.env.SWING_RADAR_KRX_API_DATA_PATH ?? "data",
    apiTickerField: process.env.SWING_RADAR_KRX_API_FIELD_TICKER ?? "ticker",
    apiCompanyField: process.env.SWING_RADAR_KRX_API_FIELD_COMPANY ?? "company",
    apiMarketField: process.env.SWING_RADAR_KRX_API_FIELD_MARKET ?? "market",
    apiSectorField: process.env.SWING_RADAR_KRX_API_FIELD_SECTOR ?? "sector",
    apiDartField: process.env.SWING_RADAR_KRX_API_FIELD_DART ?? "dartCorpCode",
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
    if (arg === "--api") {
      options.fetchMode = "api";
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

  if (!options.help && !options.fetchMode) {
    if (options.apiUrl) {
      options.fetchMode = "api";
    } else if (options.sourceUrl) {
      options.fetchMode = "url";
    } else if (options.downloadsDir) {
      options.fetchMode = "downloads";
    }
  }

  if (!options.help && !options.fetchMode) {
    throw new Error("One of --api, --source-url, or --downloads-dir is required");
  }

  return options;
}

function getByPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return current[key];
    }
    return undefined;
  }, value);
}

function escapeCsv(value) {
  const text = `${value ?? ""}`.replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

function toNormalizedCsv(rows, options) {
  const lines = [["ticker", "company", "market", "sector", "dartCorpCode", "aliases"].join(",")];

  for (const row of rows) {
    const record = [
      row?.[options.apiTickerField] ?? "",
      row?.[options.apiCompanyField] ?? "",
      row?.[options.apiMarketField] ?? "",
      row?.[options.apiSectorField] ?? "",
      row?.[options.apiDartField] ?? "",
      ""
    ].map(escapeCsv);

    lines.push(record.join(","));
  }

  return `${lines.join("\n")}\n`;
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

async function fetchFromApi(options, outputPath) {
  if (!options.apiUrl) {
    throw new Error("SWING_RADAR_KRX_API_URL is required for API mode");
  }
  if (!options.apiKey) {
    throw new Error("SWING_RADAR_KRX_API_KEY is required for API mode");
  }

  const response = await fetch(options.apiUrl, {
    method: options.apiMethod,
    headers: {
      "user-agent": "swing-radar-krx-fetch/1.0",
      [options.apiAuthHeader]: options.apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch KRX API payload: ${response.status} ${response.statusText}`);
  }

  if (options.apiResponseType === "csv") {
    await writeFile(outputPath, await response.text(), "utf8");
    return;
  }

  const payload = await response.json();
  const rows = getByPath(payload, options.apiDataPath);
  if (!Array.isArray(rows)) {
    throw new Error(`KRX API JSON path did not resolve to an array: ${options.apiDataPath}`);
  }

  await writeFile(outputPath, toNormalizedCsv(rows, options), "utf8");
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

  if (options.fetchMode === "api") {
    await fetchFromApi(options, outputPath);
    console.log("KRX source fetched from API.");
    console.log(`- apiUrl: ${options.apiUrl}`);
    console.log(`- responseType: ${options.apiResponseType}`);
    console.log(`- output: ${outputPath}`);
    return;
  }

  if (options.fetchMode === "url") {
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
