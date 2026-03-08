import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import {
  average,
  clamp,
  fetchJson,
  getProjectPaths,
  lastValid,
  loadWatchlist,
  parseArgs,
  writeJson
} from "./lib/external-source-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR external market fetch

Usage:
  node scripts/fetch-market-source.mjs [--out-file <path>]

Environment:
  SWING_RADAR_MARKET_PROVIDER=yahoo
  SWING_RADAR_MARKET_LOOKBACK_RANGE=6mo
`);
}

function mapRiskStatus(distancePercent) {
  if (distancePercent <= -4.5) return "주의";
  if (distancePercent <= -2.2) return "확인 필요";
  return "양호";
}

function mapHeatStatus(momentumPercent) {
  if (momentumPercent >= 8) return "주의";
  if (momentumPercent >= 3) return "확인 필요";
  return "양호";
}

function scoreTrend(currentPrice, ma20, ma60) {
  let score = 8;
  if (currentPrice > ma20) score += 6;
  if (currentPrice > ma60) score += 6;
  if (ma20 > ma60) score += 5;
  return clamp(Math.round(score), 6, 25);
}

function scoreFlow(latestVolume, avg20Volume) {
  const ratio = avg20Volume > 0 ? latestVolume / avg20Volume : 1;
  return clamp(Math.round(8 + ratio * 5), 6, 25);
}

function scoreVolatility(currentPrice, invalidationPrice) {
  const distance = Math.abs((currentPrice - invalidationPrice) / currentPrice) * 100;
  return clamp(Math.round(20 - distance * 2.2), 5, 20);
}

async function fetchYahooItem(entry, range) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${entry.marketSymbol}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", range);
  url.searchParams.set("includePrePost", "false");

  const payload = await fetchJson(url.toString(), {
    headers: {
      "User-Agent": "SWING-RADAR/0.1"
    }
  });

  const result = payload?.chart?.result?.[0];
  if (!result) {
    throw new Error(`Missing market payload for ${entry.ticker}`);
  }

  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((value) => Number.isFinite(value));
  const volumes = (result.indicators?.quote?.[0]?.volume ?? []).filter((value) => Number.isFinite(value));

  const currentPrice = lastValid(closes);
  const latestVolume = lastValid(volumes);

  if (!currentPrice || !latestVolume) {
    throw new Error(`Not enough market history for ${entry.ticker}`);
  }

  const last20 = closes.slice(-20);
  const last60 = closes.slice(-60);
  const ma20 = average(last20);
  const ma60 = average(last60.length ? last60 : closes);
  const avg20Volume = average(volumes.slice(-20));
  const low15 = Math.min(...closes.slice(-15));
  const high10 = Math.max(...closes.slice(-10));
  const invalidationPrice = Math.round(low15 * 0.995);
  const confirmationPrice = Math.round(Math.max(currentPrice * 1.01, high10));
  const expansionPrice = Math.round(currentPrice + (currentPrice - invalidationPrice) * 1.8);
  const momentumPercent = ((currentPrice - ma20) / ma20) * 100;

  return {
    ticker: entry.ticker,
    company: entry.company,
    sector: entry.sector,
    market: entry.market,
    sourceSymbol: entry.marketSymbol,
    currentPrice: Math.round(currentPrice),
    invalidationPrice,
    confirmationPrice,
    expansionPrice,
    entryPrice: Math.round(ma20),
    signalDate: new Date().toISOString().slice(0, 10),
    trendScore: scoreTrend(currentPrice, ma20, ma60),
    flowScore: scoreFlow(latestVolume, avg20Volume),
    volatilityScore: scoreVolatility(currentPrice, invalidationPrice),
    qualityScore: clamp(Math.round(10 + closes.length / 25), 8, 15),
    averageVolume20: Math.round(avg20Volume),
    latestVolume: Math.round(latestVolume),
    momentumPercent: Number(momentumPercent.toFixed(1)),
    riskStatus: mapRiskStatus(((invalidationPrice - currentPrice) / currentPrice) * 100),
    heatStatus: mapHeatStatus(momentumPercent),
    closes: closes.slice(-90),
    volumes: volumes.slice(-90)
  };
}

async function main() {
  const paths = getProjectPaths(projectRoot);
  const args = parseArgs(process.argv.slice(2), {
    outFile: path.join(paths.rawDir, "external-market.json")
  });

  if (args.help) {
    printHelp();
    return;
  }

  const watchlist = await loadWatchlist(paths.configDir);
  const range = process.env.SWING_RADAR_MARKET_LOOKBACK_RANGE ?? "6mo";
  const items = [];

  for (const entry of watchlist) {
    items.push(await fetchYahooItem(entry, range));
  }

  await writeJson(path.resolve(args.outFile), {
    asOf: new Date().toISOString(),
    provider: "yahoo",
    items
  });

  console.log("External market fetch completed.");
  console.log(`- items: ${items.length}`);
  console.log(`- outFile: ${path.resolve(args.outFile)}`);
}

main().catch((error) => {
  console.error("External market fetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});