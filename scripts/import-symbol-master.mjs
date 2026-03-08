import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function printHelp() {
  console.log(`
SWING-RADAR symbol master importer

Usage:
  node scripts/import-symbol-master.mjs --input <csv-path> [--output <json-path>] [--status <ready|pending>]

Expected CSV columns:
  ticker,company,market,sector,dartCorpCode,aliases
`);
}

function parseArgs(argv) {
  const options = {
    output: path.join(projectRoot, "data", "config", "symbol-master.json"),
    status: "pending"
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
  if (value === "KOSDAQ") return "KOSDAQ";
  return "KOSPI";
}

function toRecord(headers, values) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
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

  const master = items.map((item) => ({
    ticker: item.ticker,
    company: item.company,
    aliases: item.aliases ? item.aliases.split("|").map((value) => value.trim()).filter(Boolean) : [],
    sector: item.sector || "미분류",
    market: normalizeMarket(item.market),
    status: options.status,
    dartCorpCode: item.dartCorpCode || undefined
  }));

  await writeFile(path.resolve(options.output), `${JSON.stringify(master, null, 2)}\n`, "utf8");

  console.log("Symbol master imported.");
  console.log(`- input: ${path.resolve(options.input)}`);
  console.log(`- output: ${path.resolve(options.output)}`);
  console.log(`- count: ${master.length}`);
}

main().catch((error) => {
  console.error("Symbol master import failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
