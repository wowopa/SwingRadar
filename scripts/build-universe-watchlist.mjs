import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { getRuntimePaths } from "./lib/runtime-paths.mjs";
import { resolveSymbolMasterInputPath } from "./lib/symbol-master-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function printHelp() {
  console.log(`
SWING-RADAR universe watchlist builder

Usage:
  node scripts/build-universe-watchlist.mjs [--input <symbol-master.json>] [--output <watchlist.json>] [--markets KOSPI,KOSDAQ] [--limit 0]
`);
}

function parseArgs(argv) {
  const runtimePaths = getRuntimePaths(projectRoot);
  const options = {
    input: resolveSymbolMasterInputPath(projectRoot),
    output: path.join(runtimePaths.runtimeConfigDir, "watchlist.universe.json"),
    markets: ["KOSPI", "KOSDAQ"],
    limit: 0
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
    if (arg === "--markets") {
      options.markets = argv[index + 1].split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      options.limit = Number(argv[index + 1] ?? "0");
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildMarketSymbol(item) {
  const suffixByMarket = {
    KOSPI: "KS",
    KOSDAQ: "KQ",
    NYSE: "NY",
    NASDAQ: "NQ",
    AMEX: "AM"
  };

  return `${item.ticker}.${suffixByMarket[item.market] ?? item.market}`;
}

function defaultNewsQueriesKr(item) {
  return item.market === "KOSPI" || item.market === "KOSDAQ"
    ? [`"${item.company}" 주식`, `"${item.company}" ${item.sector}`, `"${item.company}" 실적`]
    : [`"${item.company}" stock`, `"${item.company}" earnings`, `"${item.company}" ${item.sector}`];
}

function defaultContextKeywords(item) {
  return item.market === "KOSPI" || item.market === "KOSDAQ" ? [item.sector, "실적", "주가"] : [item.sector, "earnings", "stock"];
}

function buildEntry(item) {
  return {
    ticker: item.ticker,
    company: item.company,
    sector: item.sector,
    marketSymbol: buildMarketSymbol(item),
    newsQuery: item.newsQuery || item.company,
    newsQueries: unique(item.newsQueries || [item.newsQuery || item.company]),
    newsQueriesKr: unique(item.newsQueriesKr || defaultNewsQueriesKr(item)),
    requiredKeywords: unique(item.requiredKeywords || [item.company, ...(item.aliases || []), item.ticker]),
    contextKeywords: unique(item.contextKeywords || defaultContextKeywords(item)),
    blockedKeywords: unique(item.blockedKeywords || []),
    blockedDomains: unique(item.blockedDomains || []),
    preferredDomains: unique(item.preferredDomains || ["hankyung.com", "mk.co.kr", "edaily.co.kr", "yna.co.kr"]),
    minArticleScore: item.minArticleScore || 12,
    market: item.market,
    dartCorpCode: item.dartCorpCode || ""
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const master = JSON.parse((await readFile(inputPath, "utf8")).replace(/^\uFEFF/, ""));
  const replacementPath = path.join(projectRoot, "data", "config", "symbol-replacements.json");
  let replacementTickers = new Set();

  try {
    const replacements = JSON.parse((await readFile(replacementPath, "utf8")).replace(/^\uFEFF/, ""));
    replacementTickers = new Set((replacements ?? []).map((item) => item?.ticker).filter(Boolean));
  } catch {
    replacementTickers = new Set();
  }

  const filtered = master.filter((item) => options.markets.includes(item.market) && !replacementTickers.has(item.ticker));
  const sliced = options.limit > 0 ? filtered.slice(0, options.limit) : filtered;

  const document = {
    generatedAt: new Date().toISOString(),
    count: sliced.length,
    tickers: sliced.map(buildEntry)
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  console.log("Universe watchlist built.");
  console.log(`- input: ${inputPath}`);
  console.log(`- output: ${outputPath}`);
  console.log(`- count: ${document.count}`);
  console.log(`- markets: ${options.markets.join(",")}`);
}

main().catch((error) => {
  console.error("Universe watchlist build failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
