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

function mapRiskStatus(distancePercent, currentPrice, ma20, ma60, momentumPercent) {
  let score = 0;

  if (distancePercent <= -9) score += 2;
  else if (distancePercent <= -6) score += 1;

  if (currentPrice < ma20) score += 1;
  if (currentPrice < ma60) score += 1;
  if (momentumPercent <= -9) score += 1;

  if (score >= 3) return "주의";
  if (score >= 1) return "확인 필요";
  return "양호";
}

function mapHeatStatus(momentumPercent, volumeRatio, turnoverRatio) {
  let score = 0;

  if (momentumPercent >= 12) score += 2;
  else if (momentumPercent >= 6) score += 1;

  if (volumeRatio >= 3) score += 1;
  if (turnoverRatio >= 2.4) score += 1;

  if (score >= 3) return "주의";
  if (score >= 1) return "확인 필요";
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

function calculateQualityScore(closesLength, avg20Turnover, volumeRatio, turnoverRatio) {
  let score = 8;

  if (closesLength >= 80) score += 3;
  else if (closesLength >= 60) score += 2;
  else if (closesLength >= 40) score += 1;

  if (avg20Turnover >= 300000000000) score += 3;
  else if (avg20Turnover >= 50000000000) score += 2;
  else if (avg20Turnover >= 10000000000) score += 1;

  if (volumeRatio >= 0.7 && volumeRatio <= 2.2) score += 1;
  if (turnoverRatio >= 0.65 && turnoverRatio <= 1.9) score += 1;

  return clamp(Math.round(score), 8, 15);
}

function standardDeviation(values) {
  if (!values.length) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
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

  const quote = result.indicators?.quote?.[0] ?? {};
  const pairedHistory = (quote.close ?? [])
    .map((close, index) => ({
      close,
      volume: quote.volume?.[index]
    }))
    .filter((item) => Number.isFinite(item.close) && Number.isFinite(item.volume) && item.volume > 0);

  const closes = pairedHistory.map((item) => item.close);
  const volumes = pairedHistory.map((item) => item.volume);
  const turnovers = pairedHistory.map((item) => item.close * item.volume);

  const currentPrice = lastValid(closes);
  const latestVolume = lastValid(volumes);
  const latestTurnover = lastValid(turnovers);

  if (!currentPrice || !latestVolume || !latestTurnover) {
    throw new Error(`Not enough market history for ${entry.ticker}`);
  }

  const last20 = closes.slice(-20);
  const last60 = closes.slice(-60);
  const ma20 = average(last20);
  const ma60 = average(last60.length ? last60 : closes);
  const avg20Volume = average(volumes.slice(-20));
  const avg20Turnover = average(turnovers.slice(-20));
  const volumeRatio = avg20Volume > 0 ? latestVolume / avg20Volume : 1;
  const turnoverRatio = avg20Turnover > 0 ? latestTurnover / avg20Turnover : 1;
  const recentCloses7 = closes.slice(-7);
  const recentCloses10 = closes.slice(-10);
  const low7 = Math.min(...recentCloses7);
  const high10 = Math.max(...recentCloses10);
  const distanceFromRecentHigh = ((high10 - currentPrice) / currentPrice) * 100;
  const momentumPercent = ((currentPrice - ma20) / ma20) * 100;
  const recentReturns = closes.slice(-21).flatMap((close, index, array) => {
    if (index === 0 || !Number.isFinite(array[index - 1]) || array[index - 1] === 0) {
      return [];
    }

    return [((close - array[index - 1]) / array[index - 1]) * 100];
  });
  const averageAbsMove = average(recentReturns.map((value) => Math.abs(value)));
  const returnVolatility = standardDeviation(recentReturns);
  const recentSupport = Math.max(low7 * 0.995, ma20 * 0.98, ma60 * 0.96);
  const rawInvalidationDistance = ((currentPrice - recentSupport) / currentPrice) * 100;
  const recentSwingRangePercent = ((high10 - low7) / currentPrice) * 100;
  const supportGapPercent = Math.abs(((ma20 - ma60) / currentPrice) * 100);
  const trendCompression = Math.max(0, momentumPercent - 6) * 0.12;
  const breakoutCompression = Math.max(0, 5 - distanceFromRecentHigh) * 0.18;
  const invalidationFloor = clamp(
    Math.max(2.8, averageAbsMove * 0.82, returnVolatility * 0.5),
    2.8,
    5.4
  );
  const invalidationCeilingBase =
    averageAbsMove * 1.25 +
    returnVolatility * 0.22 +
    supportGapPercent * 0.1 +
    recentSwingRangePercent * 0.04 -
    trendCompression -
    breakoutCompression;
  const invalidationCeiling = clamp(
    invalidationCeilingBase,
    currentPrice >= ma20 && ma20 >= ma60 ? 4.4 : 5.2,
    currentPrice >= ma20 && ma20 >= ma60 ? 12.5 : 14.5
  );
  const invalidationDistancePercent = clamp(
    rawInvalidationDistance,
    invalidationFloor,
    invalidationCeiling
  );
  const invalidationPrice = Math.round(currentPrice * (1 - invalidationDistancePercent / 100));
  const confirmationPrice =
    distanceFromRecentHigh <= 8 && currentPrice >= ma20
      ? Math.round(Math.max(currentPrice * 1.018, high10 * 1.002))
      : Math.round(Math.max(currentPrice * 1.04, ma20 * 1.025, ma60 * 1.04));
  const rewardDistance = Math.max(confirmationPrice - invalidationPrice, currentPrice * 0.05);
  const expansionPrice = Math.round(confirmationPrice + rewardDistance * 1.4);
  const riskDistance = ((invalidationPrice - currentPrice) / currentPrice) * 100;

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
    qualityScore: calculateQualityScore(closes.length, avg20Turnover, volumeRatio, turnoverRatio),
    averageVolume20: Math.round(avg20Volume),
    latestVolume: Math.round(latestVolume),
    averageTurnover20: Math.round(avg20Turnover),
    latestTurnover: Math.round(latestTurnover),
    momentumPercent: Number(momentumPercent.toFixed(1)),
    riskStatus: mapRiskStatus(riskDistance, currentPrice, ma20, ma60, momentumPercent),
    heatStatus: mapHeatStatus(momentumPercent, volumeRatio, turnoverRatio),
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
  const skipped = [];

  for (const entry of watchlist) {
    try {
      items.push(await fetchYahooItem(entry, range));
    } catch (error) {
      skipped.push({
        ticker: entry.ticker,
        company: entry.company,
        message: error instanceof Error ? error.message : String(error)
      });
      console.warn(`Market fetch skipped for ${entry.ticker}: ${error instanceof Error ? error.message : error}`);
    }
  }

  await writeJson(path.resolve(args.outFile), {
    asOf: new Date().toISOString(),
    provider: "yahoo",
    items,
    skipped
  });

  console.log("External market fetch completed.");
  console.log(`- items: ${items.length}`);
  console.log(`- skipped: ${skipped.length}`);
  console.log(`- output: ${path.resolve(args.outFile)}`);
}

main().catch((error) => {
  console.error("External market fetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
