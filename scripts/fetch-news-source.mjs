import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, loadWatchlist, parseArgs, readJson, writeJson } from "./lib/external-source-utils.mjs";
import { dedupeArticles, fetchGNews, fetchNaverNews, matchesFilters } from "./lib/news-providers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR external news fetch

Usage:
  node scripts/fetch-news-source.mjs [--out-file <path>] [--cache-file <path>]

Environment:
  SWING_RADAR_NEWS_PROVIDER=naver | gnews | file
  SWING_RADAR_NAVER_CLIENT_ID=<id>
  SWING_RADAR_NAVER_CLIENT_SECRET=<secret>
  SWING_RADAR_NEWS_API_KEY=<gnews-key>
  SWING_RADAR_NEWS_MAX_ITEMS=5
  SWING_RADAR_NEWS_RETRY_LIMIT=2
`);
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return { items: [] };
  }
}

function filterFallbackItems(items, entry, maxItems) {
  return dedupeArticles(items.filter((item) => matchesFilters(item, entry))).slice(0, maxItems);
}

async function loadFileNews(paths, entry, maxItems) {
  const payload = await readOptionalJson(path.join(paths.rawDir, "news-snapshot.json"));
  const items = (payload.items ?? [])
    .filter((item) => item.ticker === entry.ticker)
    .map((item) => ({
      ticker: item.ticker,
      company: entry.company,
      headline: item.headline,
      summary: item.summary,
      source: "file",
      url: `https://fallback.local/${item.ticker}`,
      date: item.date,
      impact: item.impact
    }));

  return filterFallbackItems(items, entry, maxItems);
}

function loadCacheNews(cache, entry, maxItems) {
  const items = (cache.items ?? []).filter((item) => item.ticker === entry.ticker);
  return filterFallbackItems(items, entry, maxItems);
}

function resolveProviderOrder() {
  const requested = process.env.SWING_RADAR_NEWS_PROVIDER;
  if (requested === "file") {
    return ["file"];
  }
  if (requested === "gnews") {
    return ["gnews", "naver"];
  }
  if (requested === "naver") {
    return ["naver", "gnews"];
  }

  return ["naver", "gnews"];
}

function getNewsFetchReportPath() {
  return process.env.SWING_RADAR_NEWS_FETCH_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_NEWS_FETCH_REPORT_PATH)
    : path.join(projectRoot, "data", "ops", "latest-news-fetch.json");
}

async function fetchFromProvider(provider, entry, maxItems, telemetry) {
  if (provider === "naver") {
    return fetchNaverNews(entry, maxItems, telemetry);
  }
  if (provider === "gnews") {
    return fetchGNews(entry, maxItems, telemetry);
  }
  return [];
}

async function main() {
  const paths = getProjectPaths(projectRoot);
  const args = parseArgs(process.argv.slice(2), {
    outFile: path.join(paths.rawDir, "external-news.json"),
    cacheFile: path.join(paths.rawDir, "external-news-cache.json")
  });

  if (args.help) {
    printHelp();
    return;
  }

  const watchlist = await loadWatchlist(paths.configDir);
  const maxItems = Number(process.env.SWING_RADAR_NEWS_MAX_ITEMS ?? "5");
  const providerOrder = resolveProviderOrder();
  const cache = await readOptionalJson(path.resolve(args.cacheFile));
  const items = [];
  let providerUsed = "file";
  let anyLiveFetch = false;
  const report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    providerOrder,
    requestedProvider: process.env.SWING_RADAR_NEWS_PROVIDER ?? "auto",
    totalTickers: watchlist.length,
    liveFetchTickers: 0,
    cacheFallbackTickers: 0,
    fileFallbackTickers: 0,
    retryCount: 0,
    providerFailures: [],
    totalItems: 0
  };

  for (const entry of watchlist) {
    let fetched = [];

    for (const provider of providerOrder) {
      try {
        fetched = await fetchFromProvider(provider, entry, maxItems, {
          onRetry: ({ status, delayMs, attempt, url }) => {
            report.retryCount += 1;
            report.providerFailures.push({
              ticker: entry.ticker,
              provider,
              status,
              attempt,
              delayMs,
              url,
              phase: "retry"
            });
          }
        });

        if (fetched.length) {
          providerUsed = provider;
          anyLiveFetch = true;
          report.liveFetchTickers += 1;
          break;
        }
      } catch (error) {
        report.providerFailures.push({
          ticker: entry.ticker,
          provider,
          status: error && typeof error === "object" && "status" in error ? error.status : null,
          attempt: null,
          delayMs: null,
          url: error && typeof error === "object" && "url" in error ? error.url : null,
          phase: "failed",
          message: error instanceof Error ? error.message : String(error)
        });
        console.warn(`News fetch failed for ${entry.ticker} via ${provider}: ${error instanceof Error ? error.message : error}`);
      }
    }

    if (!fetched.length) {
      fetched = loadCacheNews(cache, entry, maxItems);
      if (fetched.length) {
        report.cacheFallbackTickers += 1;
      }
    }

    if (!fetched.length) {
      fetched = await loadFileNews(paths, entry, maxItems);
      if (fetched.length) {
        report.fileFallbackTickers += 1;
      }
      providerUsed = providerUsed === "file" ? "file" : providerUsed;
    }

    items.push(...fetched.slice(0, maxItems));
  }

  const normalizedItems = dedupeArticles(items);
  report.totalItems = normalizedItems.length;
  report.completedAt = new Date().toISOString();

  if (anyLiveFetch) {
    await writeJson(path.resolve(args.cacheFile), {
      asOf: new Date().toISOString(),
      provider: `${providerUsed}-cache`,
      items: normalizedItems
    });
  }

  await writeJson(path.resolve(args.outFile), {
    asOf: new Date().toISOString(),
    provider: anyLiveFetch ? providerUsed : "file",
    items: normalizedItems
  });
  await writeJson(getNewsFetchReportPath(), report);

  console.log("External news fetch completed.");
  console.log(`- provider: ${anyLiveFetch ? providerUsed : "file"}`);
  console.log(`- items: ${normalizedItems.length}`);
  console.log(`- outFile: ${path.resolve(args.outFile)}`);
  console.log(`- report: ${getNewsFetchReportPath()}`);
}

main().catch((error) => {
  console.error("External news fetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
