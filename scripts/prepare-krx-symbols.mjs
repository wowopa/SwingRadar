import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function printHelp() {
  console.log(`
SWING-RADAR KRX symbol CSV transformer

Usage:
  node scripts/prepare-krx-symbols.mjs --input <krx-source.csv> [--output <symbol-master.csv>] [--default-status <ready|pending>]

Output columns:
  ticker,company,market,sector,dartCorpCode,aliases
`);
}

function parseArgs(argv) {
  const options = {
    output: path.join(projectRoot, "data", "config", "krx-symbol-master.csv"),
    defaultStatus: "pending"
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
    if (arg === "--default-status") {
      options.defaultStatus = argv[index + 1];
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

function toRecord(headers, values) {
  return Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] ?? ""]));
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function pick(record, candidates) {
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeTicker(value) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function normalizeMarket(value) {
  const text = value.trim().toUpperCase();

  if (text.includes("KOSDAQ") || text.includes("코스닥")) {
    return "KOSDAQ";
  }

  if (text.includes("KOSPI") || text.includes("유가") || text.includes("코스피")) {
    return "KOSPI";
  }

  return "";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const content = (await readFile(inputPath, "utf8")).replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Input CSV does not contain data rows");
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => toRecord(headers, parseCsvLine(line)));

  const normalizedRows = rows
    .map((row) => {
      const ticker = normalizeTicker(
        pick(row, ["ticker", "종목코드", "단축코드", "표준코드", "Symbol", "symbol"])
      );
      const company = pick(row, ["company", "종목명", "한글종목명", "회사명", "종목약명", "Name", "name"]);
      const market = normalizeMarket(pick(row, ["market", "시장구분", "시장구분명", "시장", "Market", "market"]));
      const sector = pick(row, ["sector", "업종", "업종명", "산업", "Sector", "sector"]) || "미분류";
      const dartCorpCode = pick(row, ["dartCorpCode", "corpCode", "corp_code", "DART회사코드", "DART코드"]);
      const aliasValue = pick(row, ["aliases", "별칭", "영문명", "영문종목명", "EnglishName"]);
      const aliases = aliasValue
        ? aliasValue
            .split(/[|/]/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

      return {
        ticker,
        company,
        market,
        sector,
        dartCorpCode,
        aliases: aliases.join("|")
      };
    })
    .filter((row) => row.ticker && row.company && row.market);

  const csvLines = [
    "ticker,company,market,sector,dartCorpCode,aliases",
    ...normalizedRows.map((row) =>
      [
        row.ticker,
        row.company,
        row.market,
        row.sector,
        row.dartCorpCode,
        row.aliases
      ]
        .map(escapeCsv)
        .join(",")
    )
  ];

  await writeFile(outputPath, `${csvLines.join("\n")}\n`, "utf8");

  console.log("KRX symbol CSV prepared.");
  console.log(`- input: ${inputPath}`);
  console.log(`- output: ${outputPath}`);
  console.log(`- rows: ${normalizedRows.length}`);
  console.log(`- defaultStatus: ${options.defaultStatus}`);
}

main().catch((error) => {
  console.error("KRX symbol CSV preparation failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
