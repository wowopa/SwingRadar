import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { calculateCandidateScore, getLiquidityAdjustment } from "./lib/candidate-score-utils.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR universe batch scan

Usage:
  node scripts/scan-universe-batches.mjs [--watchlist <path>] [--batch-size <number>] [--concurrency <number>] [--top-candidates <number>] [--limit <number>] [--output <path>] [--skip-ingest] [--news-provider <naver|gnews|file>] [--disclosure-provider <dart|file>]
`);
}

function parseArgs(argv) {
  const options = {
    watchlist: path.join(projectRoot, "data", "config", "watchlist.universe.json"),
    batchSize: Number(process.env.SWING_RADAR_UNIVERSE_BATCH_SIZE ?? "20"),
    concurrency: Number(process.env.SWING_RADAR_UNIVERSE_CONCURRENCY ?? "1"),
    topCandidatesLimit: Number(process.env.SWING_RADAR_UNIVERSE_TOP_CANDIDATES ?? "100"),
    limit: 0,
    output: path.join(projectRoot, "data", "universe", "daily-candidates.json"),
    skipIngest: false,
    newsProvider: process.env.SWING_RADAR_NEWS_PROVIDER,
    disclosureProvider: process.env.SWING_RADAR_DISCLOSURE_PROVIDER
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--watchlist") {
      options.watchlist = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--batch-size") {
      options.batchSize = Number(argv[index + 1] ?? options.batchSize);
      index += 1;
      continue;
    }
    if (arg === "--concurrency") {
      options.concurrency = Number(argv[index + 1] ?? options.concurrency);
      index += 1;
      continue;
    }
    if (arg === "--top-candidates") {
      options.topCandidatesLimit = Number(argv[index + 1] ?? options.topCandidatesLimit);
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      options.limit = Number(argv[index + 1] ?? "0");
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--news-provider") {
      options.newsProvider = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--disclosure-provider") {
      options.disclosureProvider = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--skip-ingest") {
      options.skipIngest = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getHistoryPath() {
  return process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE
    ? path.resolve(process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE)
    : path.join(projectRoot, "data", "universe", "daily-candidates-history.json");
}

function getLiveDataDir() {
  return process.env.SWING_RADAR_DATA_DIR
    ? path.resolve(process.env.SWING_RADAR_DATA_DIR)
    : path.join(projectRoot, "data", "live");
}

async function readHistory() {
  try {
    return JSON.parse((await readFile(getHistoryPath(), "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return { runs: [] };
  }
}

async function writeHistory(entry) {
  const history = await readHistory();
  const maxRuns = normalizePositiveInteger(process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_LIMIT ?? "180", 180);
  const runs = [entry, ...(history.runs ?? [])]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.generatedAt === item.generatedAt) === index)
    .slice(0, maxRuns);

  const historyPath = getHistoryPath();
  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(historyPath, `${JSON.stringify({ runs }, null, 2)}\n`, "utf8");
}

async function writeLiveSnapshots({ generatedAt, topCandidates, batchResults }) {
  const liveDir = getLiveDataDir();
  const recommendationsPath = path.join(liveDir, "recommendations.json");
  const analysisPath = path.join(liveDir, "analysis.json");
  const recommendationMap = new Map();
  const analysisMap = new Map();

  for (const result of batchResults) {
    if (!result.ok) {
      continue;
    }

    for (const item of result.recommendations.items ?? []) {
      recommendationMap.set(item.ticker, item);
    }
    for (const item of result.analysis.items ?? []) {
      analysisMap.set(item.ticker, item);
    }
  }

  const rankedRecommendations = topCandidates.flatMap((candidate, index) => {
    const recommendation = recommendationMap.get(candidate.ticker);
    if (!recommendation) {
      return [];
    }

    return [{
      ...recommendation,
      featuredRank: index + 1,
      candidateScore: candidate.candidateScore,
      eventCoverage: candidate.eventCoverage,
      candidateBatch: candidate.batch
    }];
  });

  const rankedAnalysis = topCandidates.flatMap((candidate) => {
    const analysis = analysisMap.get(candidate.ticker);
    return analysis ? [analysis] : [];
  });

  await mkdir(liveDir, { recursive: true });
  await writeFile(
    recommendationsPath,
    `${JSON.stringify({ generatedAt, items: rankedRecommendations }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    analysisPath,
    `${JSON.stringify({ generatedAt, items: rankedAnalysis }, null, 2)}\n`,
    "utf8"
  );
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function runNodeScript(scriptName, args, env) {
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName), ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env
    }
  });
}

function shouldExcludeCandidate(currentPrice, averageTurnover20, thresholds) {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(averageTurnover20)) {
    return true;
  }

  if (currentPrice < thresholds.minPrice) {
    return true;
  }

  if (averageTurnover20 < thresholds.minAverageTurnover20) {
    return true;
  }

  return false;
}

function scoreCandidates(recommendations, analysis, marketItemsByTicker, batchIndex, thresholds) {
  const analysisByTicker = new Map(analysis.items.map((item) => [item.ticker, item]));
  return recommendations.items.flatMap((item) => {
    const detail = analysisByTicker.get(item.ticker);
    const market = marketItemsByTicker.get(item.ticker);
    const currentPrice = market?.currentPrice ?? null;
    const averageTurnover20 = market?.averageTurnover20 ?? null;
    const volumeRatio =
      Number(market?.latestVolume ?? 0) > 0 && Number(market?.averageVolume20 ?? 0) > 0
        ? Number((market.latestVolume / market.averageVolume20).toFixed(2))
        : null;

    if (shouldExcludeCandidate(currentPrice, averageTurnover20, thresholds)) {
      return [];
    }

    const eventCoverage = detail?.dataQuality.find((entry) => entry.label === "커버리지")?.value ?? "취약";
    const liquidity = getLiquidityAdjustment(averageTurnover20);
    const candidateScore = calculateCandidateScore({
      score: item.score,
      validation: item.validation,
      validationBasis: item.validationBasis,
      eventCoverage,
      averageTurnover20,
      currentPrice,
      volumeRatio,
      signalTone: item.signalTone
    });

    return [{
      batch: batchIndex + 1,
      ticker: item.ticker,
      company: item.company,
      sector: item.sector,
      signalTone: item.signalTone,
      score: item.score,
      candidateScore,
      currentPrice,
      averageTurnover20,
      volumeRatio,
      liquidityRating: liquidity.rating,
      invalidation: item.invalidation,
      validationSummary: item.validationSummary,
      observationWindow: item.observationWindow,
      rationale: item.rationale,
      eventCoverage
    }];
  });
}

function summarizeBatchWarnings(errors) {
  if (!errors.length) {
    return [];
  }

  return errors.map((item) => {
    if (item.startsWith("fetch-market-source.mjs:")) {
      return "일부 종목 시세를 불러오지 못해 후보 수가 줄었습니다.";
    }
    if (item.startsWith("fetch-news-source.mjs:")) {
      return "일부 뉴스 수집이 비어 있어 이벤트 품질이 낮아졌습니다.";
    }
    if (item.startsWith("fetch-disclosures-source.mjs:")) {
      return "일부 공시 수집이 비어 있어 보수적으로 계산했습니다.";
    }
    if (item.startsWith("ingest-postgres.mjs:")) {
      return "Postgres 적재는 실패했지만 배치 산출물은 생성했습니다.";
    }
    return item;
  });
}

function buildBatchEnv(baseEnv, batchWatchlistPath, rawDir, liveDir, options) {
  const reportDir = path.join(path.dirname(rawDir), "ops");

  return {
    ...baseEnv,
    SWING_RADAR_WATCHLIST_FILE: batchWatchlistPath,
    SWING_RADAR_RAW_DATA_DIR: rawDir,
    SWING_RADAR_DATA_DIR: liveDir,
    SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH: path.join(reportDir, "latest-snapshot-generation.json"),
    ...(options.newsProvider ? { SWING_RADAR_NEWS_PROVIDER: options.newsProvider } : {}),
    ...(options.disclosureProvider ? { SWING_RADAR_DISCLOSURE_PROVIDER: options.disclosureProvider } : {})
  };
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function readJsonWithRetry(filePath) {
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const content = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "").trim();
      if (!content) {
        throw new SyntaxError(`Empty JSON file: ${filePath}`);
      }

      return JSON.parse(content);
    } catch (error) {
      lastError = error;
      const isSyntaxError = error instanceof SyntaxError || /Unexpected end of JSON input/i.test(String(error));
      if (!isSyntaxError || attempt === 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error(`Failed to read JSON: ${filePath}`);
}

async function runBatch(batch, index, tempRoot, options) {
  const batchDir = path.join(tempRoot, `batch-${String(index + 1).padStart(3, "0")}`);
  const rawDir = path.join(batchDir, "raw");
  const liveDir = path.join(batchDir, "live");
  const batchWatchlistPath = path.join(batchDir, "watchlist.json");

  await mkdir(rawDir, { recursive: true });
  await mkdir(liveDir, { recursive: true });
  await writeFile(batchWatchlistPath, `${JSON.stringify({ tickers: batch }, null, 2)}\n`, "utf8");

  const env = buildBatchEnv(process.env, batchWatchlistPath, rawDir, liveDir, options);
  const errors = [];

  for (const scriptName of [
    "fetch-market-source.mjs",
    "fetch-news-source.mjs",
    "fetch-disclosures-source.mjs",
    "sync-external-raw.mjs",
    "generate-snapshots.mjs"
  ]) {
    try {
      await runNodeScript(scriptName, [], env);
    } catch (error) {
      errors.push(`${scriptName}: ${error instanceof Error ? error.message : error}`);
      if (scriptName === "fetch-market-source.mjs" || scriptName === "sync-external-raw.mjs" || scriptName === "generate-snapshots.mjs") {
        break;
      }
    }
  }

  const recommendationPath = path.join(liveDir, "recommendations.json");
  const analysisPath = path.join(liveDir, "analysis.json");
  const trackingPath = path.join(liveDir, "tracking.json");
  const marketSnapshotPath = path.join(rawDir, "market-snapshot.json");
  const hasOutputs = (await fileExists(recommendationPath)) && (await fileExists(analysisPath)) && (await fileExists(trackingPath));

  if (!hasOutputs) {
    return {
      ok: false,
      batch: index + 1,
      count: batch.length,
      errors
    };
  }

  const recommendations = await readJsonWithRetry(recommendationPath);
  const analysis = await readJsonWithRetry(analysisPath);
  const tracking = await readJsonWithRetry(trackingPath);
  const marketSnapshot = await readJsonWithRetry(marketSnapshotPath);
  const marketItemsByTicker = new Map((marketSnapshot.items ?? []).map((item) => [item.ticker, item]));

  if (!options.skipIngest) {
    try {
      await runNodeScript("ingest-postgres.mjs", ["--data-dir", liveDir], env);
    } catch (error) {
      errors.push(`ingest-postgres.mjs: ${error instanceof Error ? error.message : error}`);
    }
  }

  const thresholds = {
    minPrice: normalizePositiveNumber(process.env.SWING_RADAR_RANKING_MIN_PRICE ?? "2000", 2000),
    minAverageTurnover20: normalizePositiveNumber(
      process.env.SWING_RADAR_RANKING_MIN_AVG_TURNOVER20 ?? "1500000000",
      1_500_000_000
    )
  };
  const candidates = scoreCandidates(recommendations, analysis, marketItemsByTicker, index, thresholds);

  return {
    ok: true,
    batch: index + 1,
    count: batch.length,
    generatedAt: recommendations.generatedAt,
    topTicker: [...candidates].sort((left, right) => right.candidateScore - left.candidateScore)[0]?.ticker ?? null,
    trackingRows: tracking.history.length,
    recommendations,
    analysis,
    candidates,
    errors
  };
}

async function runBatchesInParallel(batches, tempRoot, options) {
  const total = batches.length;
  const results = new Array(total);
  const concurrency = Math.min(normalizePositiveInteger(options.concurrency, 1), total);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= total) {
        return;
      }

      const batch = batches[currentIndex];
      results[currentIndex] = await runBatch(batch, currentIndex, tempRoot, options);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const watchlistPath = path.resolve(options.watchlist);
  const payload = JSON.parse((await readFile(watchlistPath, "utf8")).replace(/^\uFEFF/, ""));
  const entries = options.limit > 0 ? payload.tickers.slice(0, options.limit) : payload.tickers;
  const batches = chunk(entries, Math.max(options.batchSize, 1));
  const allCandidates = [];
  const batchSummaries = [];
  const failedBatches = [];
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-universe-"));

  try {
    const results = await runBatchesInParallel(batches, tempRoot, options);

    for (const result of results) {
      if (!result.ok) {
        failedBatches.push(result);
        continue;
      }

      allCandidates.push(...result.candidates);
      batchSummaries.push({
        batch: result.batch,
        count: result.count,
        generatedAt: result.generatedAt,
        topTicker: result.topTicker,
        trackingRows: result.trackingRows,
        warnings: summarizeBatchWarnings(result.errors)
      });
    }

    const sorted = [...allCandidates].sort((left, right) => right.candidateScore - left.candidateScore);
    const topCandidatesLimit = normalizePositiveInteger(options.topCandidatesLimit, 100);
    const document = {
      generatedAt: new Date().toISOString(),
      batchSize: options.batchSize,
      concurrency: normalizePositiveInteger(options.concurrency, 1),
      topCandidatesLimit,
      totalTickers: entries.length,
      totalBatches: batches.length,
      succeededBatches: batchSummaries.length,
      failedBatches,
      topCandidates: sorted.slice(0, topCandidatesLimit),
      batchSummaries
    };

    const outputPath = path.resolve(options.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    await writeHistory({
      generatedAt: document.generatedAt,
      totalTickers: document.totalTickers,
      totalBatches: document.totalBatches,
      succeededBatches: document.succeededBatches,
      failedBatchCount: document.failedBatches.length,
      topCandidatesLimit: document.topCandidatesLimit,
      topCandidates: document.topCandidates
    });
    await writeLiveSnapshots({
      generatedAt: document.generatedAt,
      topCandidates: document.topCandidates,
      batchResults: results
    });

    console.log("Universe batch scan completed.");
    console.log(`- watchlist: ${watchlistPath}`);
    console.log(`- totalTickers: ${entries.length}`);
    console.log(`- totalBatches: ${batches.length}`);
    console.log(`- succeededBatches: ${batchSummaries.length}`);
    console.log(`- failedBatches: ${failedBatches.length}`);
    console.log(`- topCandidates: ${document.topCandidates.length}`);
    console.log(`- output: ${outputPath}`);
    console.log(`- live snapshots: ${getLiveDataDir()}`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Universe batch scan failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
