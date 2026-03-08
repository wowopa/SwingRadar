import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const allowedMarkets = new Set(["KOSPI", "KOSDAQ", "NYSE", "NASDAQ", "AMEX"]);

function printHelp() {
  console.log(`
SWING-RADAR symbol master importer

Usage:
  node scripts/import-symbol-master.mjs --input <csv-path> [--output <json-path>] [--status <ready|pending>] [--merge]

Expected CSV columns:
  ticker,company,market,sector,dartCorpCode,aliases
`);
}

function parseArgs(argv) {
  const options = {
    output: path.join(projectRoot, "data", "config", "symbol-master.json"),
    status: "pending",
    merge: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--input") {
      options.input = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--status") {
      options.status = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--merge") {
      options.merge = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.input) {
    throw new Error("--input is required");
  }

  return options;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeMarket(value) {
  const normalized = value.trim().toUpperCase();

  if (!allowedMarkets.has(normalized)) {
    throw new Error(`Unsupported market: ${value}`);
  }

  return normalized;
}

function normalizeRegion(market) {
  return market === "KOSPI" || market === "KOSDAQ" ? "KR" : "US";
}

function toRecord(headers, values) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
}

async function loadExisting(outputPath) {
  try {
    return JSON.parse((await readFile(outputPath, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return [];
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const content = await readFile(path.resolve(options.input), "utf8");
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const items = lines.slice(1).map((line) => toRecord(headers, parseCsvLine(line)));

  const imported = items.map((item) => {
    const market = normalizeMarket(item.market);

    return {
      ticker: item.ticker.trim().toUpperCase(),
      company: item.company.trim(),
      aliases: item.aliases ? item.aliases.split("|").map((value) => value.trim()).filter(Boolean) : [],
      sector: item.sector || "미분류",
      market,
      region: normalizeRegion(market),
      status: options.status,
      dartCorpCode: item.dartCorpCode || undefined
    };
  });

  const outputPath = path.resolve(options.output);
  const master = options.merge ? await loadExisting(outputPath) : [];
  const merged = new Map(master.map((item) => [item.ticker, item]));

  for (const item of imported) {
    merged.set(item.ticker, {
      ...merged.get(item.ticker),
      ...item
    });
  }

  const nextMaster = [...merged.values()].sort((left, right) => left.ticker.localeCompare(right.ticker));
  await writeFile(outputPath, `${JSON.stringify(nextMaster, null, 2)}\n`, "utf8");

  console.log("Symbol master imported.");
  console.log(`- input: ${path.resolve(options.input)}`);
  console.log(`- output: ${outputPath}`);
  console.log(`- imported: ${imported.length}`);
  console.log(`- total: ${nextMaster.length}`);
  console.log(`- merge: ${options.merge ? "yes" : "no"}`);
}

main().catch((error) => {
  console.error("Symbol master import failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
