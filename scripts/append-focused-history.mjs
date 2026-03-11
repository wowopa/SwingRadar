import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, loadWatchlist } from "./lib/external-source-utils.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function getMarketHistoryPath() {
  return process.env.SWING_RADAR_FOCUSED_HISTORY_FILE
    ? path.resolve(process.env.SWING_RADAR_FOCUSED_HISTORY_FILE)
    : path.join(projectRoot, "data", "history", "focused-watchlist-history.json");
}

function getSignalLogPath() {
  return process.env.SWING_RADAR_FOCUSED_SIGNAL_LOG_FILE
    ? path.resolve(process.env.SWING_RADAR_FOCUSED_SIGNAL_LOG_FILE)
    : path.join(projectRoot, "data", "history", "focused-signal-log.json");
}

async function readOptionalJson(filePath, fallback) {
  try {
    return JSON.parse((await readFile(filePath, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
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

function buildWatchlistMetadataMap(entries) {
  return new Map(
    entries.map((item) => [
      item.ticker,
      {
        company: item.company,
        sector: item.sector,
        watchlistSourceTags: item.watchlistSourceTags ?? [],
        watchlistSourceDetails: item.watchlistSourceDetails ?? []
      }
    ])
  );
}

function mergeTickerHistory(existingItems, fetchedItems, watchlistMetadata) {
  const maxPoints = normalizePositiveInteger(process.env.SWING_RADAR_FOCUSED_HISTORY_POINTS ?? "190", 190);
  const merged = {};

  for (const [ticker, item] of Object.entries(existingItems ?? {})) {
    merged[ticker] = item;
  }

  for (const marketItem of fetchedItems ?? []) {
    if (!marketItem?.ticker) {
      continue;
    }

    const metadata = watchlistMetadata.get(marketItem.ticker) ?? {};
    const previous = merged[marketItem.ticker] ?? {};
    const historyMap = new Map(
      (previous.history ?? []).map((point) => [point.date, point])
    );

    for (const point of marketItem.history ?? []) {
      if (!point?.date) {
        continue;
      }

      historyMap.set(point.date, point);
    }

    const history = Array.from(historyMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-maxPoints);

    merged[marketItem.ticker] = {
      ticker: marketItem.ticker,
      company: metadata.company ?? previous.company ?? marketItem.company,
      sector: metadata.sector ?? previous.sector ?? marketItem.sector,
      market: marketItem.market ?? previous.market ?? null,
      sourceSymbol: marketItem.sourceSymbol ?? previous.sourceSymbol ?? null,
      watchlistSourceTags: metadata.watchlistSourceTags ?? previous.watchlistSourceTags ?? [],
      watchlistSourceDetails: metadata.watchlistSourceDetails ?? previous.watchlistSourceDetails ?? [],
      latestClose: marketItem.currentPrice ?? previous.latestClose ?? null,
      latestVolume: marketItem.latestVolume ?? previous.latestVolume ?? null,
      asOf: marketItem.signalDate ?? previous.asOf ?? null,
      history
    };
  }

  return merged;
}

function resolveTrackingEntryMap(trackingState) {
  return new Map(
    (trackingState.entries ?? []).map((entry) => [`${entry.ticker}:${entry.signalDate}`, entry])
  );
}

function buildSignalLogEntries(existingEntries, recommendations, dailyCandidates, watchlistMetadata, trackingState) {
  const trackingEntryMap = resolveTrackingEntryMap(trackingState);
  const dailyCandidateMap = new Map(
    (dailyCandidates.topCandidates ?? []).map((item, index) => [
      item.ticker,
      {
        featuredRank: index + 1,
        candidateScore: item.candidateScore ?? null
      }
    ])
  );
  const merged = new Map(
    (existingEntries ?? []).map((entry) => [`${entry.generatedAt}:${entry.ticker}`, entry])
  );
  const maxEntries = normalizePositiveInteger(process.env.SWING_RADAR_FOCUSED_SIGNAL_LOG_LIMIT ?? "2000", 2000);

  for (const item of recommendations.items ?? []) {
    const metadata = watchlistMetadata.get(item.ticker);
    if (!metadata) {
      continue;
    }
    const featured = dailyCandidateMap.get(item.ticker);

    const trackingEntry = trackingEntryMap.get(`${item.ticker}:${recommendations.generatedAt.slice(0, 10)}`);
    merged.set(`${recommendations.generatedAt}:${item.ticker}`, {
      generatedAt: recommendations.generatedAt,
      signalDate: recommendations.generatedAt.slice(0, 10),
      ticker: item.ticker,
      company: item.company,
      sector: item.sector,
      signalTone: item.signalTone,
      score: item.score,
      candidateScore: item.candidateScore ?? featured?.candidateScore ?? null,
      featuredRank: item.featuredRank ?? featured?.featuredRank ?? null,
      validationBasis: item.validationBasis ?? null,
      hitRate: item.validation?.hitRate ?? null,
      avgReturn: item.validation?.avgReturn ?? null,
      invalidation: item.invalidation,
      invalidationDistance: item.invalidationDistance,
      observationWindow: item.observationWindow,
      watchlistSourceTags: metadata.watchlistSourceTags ?? [],
      watchlistSourceDetails: metadata.watchlistSourceDetails ?? [],
      trackingStatus: trackingEntry?.status ?? null,
      trackingAppearances: trackingEntry?.appearances ?? null,
      trackingLatestRank: trackingEntry?.latestRank ?? null,
      trackingClosedReason: trackingEntry?.closedReason ?? null
    });
  }

  return Array.from(merged.values())
    .sort((left, right) => {
      if (left.generatedAt !== right.generatedAt) {
        return right.generatedAt.localeCompare(left.generatedAt);
      }
      return left.ticker.localeCompare(right.ticker);
    })
    .slice(0, maxEntries);
}

async function main() {
  const paths = getProjectPaths(projectRoot);
  process.env.SWING_RADAR_FOCUSED_WATCHLIST_ENABLED = "true";
  const watchlistEntries = await loadWatchlist(paths.configDir);
  const watchlistMetadata = buildWatchlistMetadataMap(watchlistEntries);
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-focused-history-"));
  const outFile = path.join(tempRoot, "external-market.json");

  try {
    await runNodeScript("fetch-market-source.mjs", ["--out-file", outFile], {
      SWING_RADAR_FOCUSED_WATCHLIST_ENABLED: "true",
      SWING_RADAR_DATA_DIR: paths.liveDir,
      SWING_RADAR_RAW_DATA_DIR: paths.rawDir
    });

    const [marketPayload, existingHistory, existingSignalLog, recommendations, dailyCandidates, trackingState] = await Promise.all([
      readOptionalJson(outFile, { items: [] }),
      readOptionalJson(getMarketHistoryPath(), { items: {} }),
      readOptionalJson(getSignalLogPath(), { entries: [] }),
      readOptionalJson(path.join(paths.liveDir, "recommendations.json"), { generatedAt: new Date().toISOString(), items: [] }),
      readOptionalJson(path.join(projectRoot, "data", "universe", "daily-candidates.json"), { topCandidates: [] }),
      readOptionalJson(path.join(projectRoot, "data", "tracking", "service-tracking-state.json"), { entries: [] })
    ]);

    const mergedHistory = mergeTickerHistory(existingHistory.items, marketPayload.items, watchlistMetadata);
    const signalEntries = buildSignalLogEntries(
      existingSignalLog.entries,
      recommendations,
      dailyCandidates,
      watchlistMetadata,
      trackingState
    );

    await mkdir(path.dirname(getMarketHistoryPath()), { recursive: true });
    await writeFile(
      getMarketHistoryPath(),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          lookbackRange: process.env.SWING_RADAR_MARKET_LOOKBACK_RANGE ?? "6mo",
          tickerCount: Object.keys(mergedHistory).length,
          items: mergedHistory
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await mkdir(path.dirname(getSignalLogPath()), { recursive: true });
    await writeFile(
      getSignalLogPath(),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          tickerCount: watchlistEntries.length,
          entryCount: signalEntries.length,
          entries: signalEntries
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    console.log("Focused history append completed.");
    console.log(`- watchlistTickers: ${watchlistEntries.length}`);
    console.log(`- marketHistoryTickers: ${Object.keys(mergedHistory).length}`);
    console.log(`- signalEntries: ${signalEntries.length}`);
    console.log(`- marketHistoryFile: ${getMarketHistoryPath()}`);
    console.log(`- signalLogFile: ${getSignalLogPath()}`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Focused history append failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
