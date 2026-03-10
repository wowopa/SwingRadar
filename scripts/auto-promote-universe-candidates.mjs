import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { getAutoPromotionPolicy, buildPromotionMetrics, evaluateAutoPromotionCandidate } from "./lib/auto-promotion-utils.mjs";
import { loadLocalEnv } from "./load-env.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR auto promote universe candidates

Usage:
  node scripts/auto-promote-universe-candidates.mjs [--apply]
`);
}

function parseArgs(argv) {
  return {
    help: argv.includes("--help"),
    apply: argv.includes("--apply")
  };
}

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function getPathFromEnv(envKey, fallbackSegments) {
  return process.env[envKey]
    ? path.resolve(process.env[envKey])
    : path.resolve(projectRoot, ...fallbackSegments);
}

function getDailyCandidatesPath() {
  return getPathFromEnv("SWING_RADAR_DAILY_CANDIDATES_FILE", ["data", "universe", "daily-candidates.json"]);
}

function getDailyCandidatesHistoryPath() {
  return getPathFromEnv("SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE", ["data", "universe", "daily-candidates-history.json"]);
}

function getWatchlistPath() {
  return getPathFromEnv("SWING_RADAR_WATCHLIST_FILE", ["data", "config", "watchlist.json"]);
}

function getReviewPath() {
  return getPathFromEnv("SWING_RADAR_UNIVERSE_REVIEW_FILE", ["data", "universe", "candidate-reviews.json"]);
}

function getSymbolMasterPath() {
  return path.resolve(projectRoot, "data", "config", "symbol-master.json");
}

function getReportPath() {
  return getPathFromEnv("SWING_RADAR_AUTO_PROMOTION_REPORT_PATH", ["data", "ops", "latest-auto-promotion.json"]);
}

async function readJson(filePath, fallback) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function buildMarketSymbol(ticker, market) {
  const suffixByMarket = {
    KOSPI: "KS",
    KOSDAQ: "KQ",
    NYSE: "NY",
    NASDAQ: "NQ",
    AMEX: "AM"
  };

  return `${ticker}.${suffixByMarket[market] ?? "KS"}`;
}

function defaultNewsQueriesKr(company, sector) {
  return [`"${company}" 주식`, `"${company}" ${sector}`, `"${company}" 실적`];
}

function buildWatchlistEntry(symbol, candidate) {
  const company = symbol?.company ?? candidate.company;
  const sector = symbol?.sector ?? candidate.sector;
  const aliases = Array.isArray(symbol?.aliases) ? symbol.aliases : [];
  const newsQuery = symbol?.newsQuery?.trim() || company;
  const newsQueries = unique(symbol?.newsQueries ?? [newsQuery, ...aliases.slice(0, 2)]);
  const newsQueriesKr = unique(symbol?.newsQueriesKr ?? defaultNewsQueriesKr(company, sector));
  const requiredKeywords = unique(symbol?.requiredKeywords ?? [company, ...aliases, candidate.ticker]);
  const contextKeywords = unique(symbol?.contextKeywords ?? [sector, "실적", "주가"]);
  const blockedKeywords = unique(symbol?.blockedKeywords ?? []);
  const blockedDomains = unique(symbol?.blockedDomains ?? []);
  const preferredDomains = unique(symbol?.preferredDomains ?? ["hankyung.com", "mk.co.kr", "edaily.co.kr", "yna.co.kr"]);
  const market = symbol?.market ?? "KOSPI";

  return {
    ticker: candidate.ticker,
    company,
    sector,
    marketSymbol: buildMarketSymbol(candidate.ticker, market),
    newsQuery,
    newsQueries,
    newsQueriesKr,
    requiredKeywords,
    contextKeywords,
    blockedKeywords,
    blockedDomains,
    preferredDomains,
    minArticleScore: Number(symbol?.minArticleScore ?? 12),
    market,
    dartCorpCode: symbol?.dartCorpCode ?? ""
  };
}

function buildReviewNote(candidate, metrics) {
  return [
    "자동 편입",
    `최근 ${metrics.appearanceCount}회 등장`,
    `최근 ${metrics.consecutiveRecentAppearances}회 연속 포착`,
    `평균 순위 ${metrics.averageRank?.toFixed(1) ?? "-"}`,
    `평균 후보 점수 ${metrics.averageCandidateScore?.toFixed(1) ?? "-"}`,
    `평균 상대 거래량 ${metrics.averageVolumeRatio?.toFixed(2) ?? "-"}`,
    `20일 평균 거래대금 ${(metrics.averageTurnover20 ?? 0).toLocaleString("ko-KR")}원`,
    `현재 점수 ${Number(candidate.candidateScore ?? 0).toFixed(1)}`
  ].join(" · ");
}

async function runRefreshScript(ticker) {
  const startedAt = Date.now();
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", "refresh-watchlist-entry.mjs"), "--ticker", ticker], {
    cwd: projectRoot,
    env: process.env
  });
  return Date.now() - startedAt;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const policy = getAutoPromotionPolicy();
  const report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    apply: options.apply,
    enabled: policy.enabled,
    policy,
    summary: null,
    qualifyingCandidates: [],
    promoted: [],
    skipped: []
  };

  const dailyCandidates = await readJson(getDailyCandidatesPath(), null);
  const historyDocument = await readJson(getDailyCandidatesHistoryPath(), { runs: [] });
  const watchlistDocument = await readJson(getWatchlistPath(), { tickers: [] });
  const reviewDocument = await readJson(getReviewPath(), { items: {} });
  const symbolMaster = await readJson(getSymbolMasterPath(), []);

  const symbolMap = new Map(symbolMaster.map((item) => [item.ticker, item]));
  const watchlistTickers = new Set((watchlistDocument.tickers ?? []).map((item) => item.ticker));
  const reviewItems = reviewDocument.items ?? {};
  const currentCandidates = Array.isArray(dailyCandidates?.topCandidates) ? dailyCandidates.topCandidates : [];

  const historyRuns = [
    ...(Array.isArray(historyDocument.runs) ? historyDocument.runs : []),
    ...(dailyCandidates ? [{ generatedAt: dailyCandidates.generatedAt, topCandidates: currentCandidates }] : [])
  ]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.generatedAt === item.generatedAt) === index)
    .slice(0, policy.lookbackRuns);

  if (historyRuns.length < policy.minHistoryRuns) {
    report.summary = {
      historyRunsAvailable: historyRuns.length,
      consideredCandidates: currentCandidates.length,
      qualifyingCandidates: 0,
      promotedCount: 0,
      message: "자동 편입을 판단하기 위한 누적 이력이 아직 부족합니다."
    };
    report.completedAt = new Date().toISOString();
    await writeJson(getReportPath(), report);
    console.log("[auto-promotion] skipped: insufficient history");
    return;
  }

  for (const candidate of currentCandidates) {
    if (watchlistTickers.has(candidate.ticker)) {
      report.skipped.push({ ticker: candidate.ticker, reason: "이미 watchlist에 포함된 종목입니다." });
      continue;
    }

    const existingReview = reviewItems[candidate.ticker];
    if (existingReview && existingReview.status !== "new") {
      report.skipped.push({ ticker: candidate.ticker, reason: `기존 검토 상태(${existingReview.status})가 있어 자동 편입에서 제외했습니다.` });
      continue;
    }

    const metrics = buildPromotionMetrics(historyRuns, candidate.ticker);
    const evaluation = evaluateAutoPromotionCandidate(candidate, metrics, policy);

    if (!evaluation.qualifies) {
      continue;
    }

    report.qualifyingCandidates.push({
      ticker: candidate.ticker,
      company: candidate.company,
      rank: currentCandidates.findIndex((item) => item.ticker === candidate.ticker) + 1,
      candidateScore: candidate.candidateScore,
      metrics
    });
  }

  report.qualifyingCandidates.sort((left, right) => {
    if (right.candidateScore !== left.candidateScore) {
      return right.candidateScore - left.candidateScore;
    }
    return left.rank - right.rank;
  });

  const selected = report.qualifyingCandidates.slice(0, policy.maxPromotionsPerRun);

  if (options.apply && policy.enabled) {
    for (const item of selected) {
      const candidate = currentCandidates.find((entry) => entry.ticker === item.ticker);
      if (!candidate) {
        continue;
      }

      const symbol = symbolMap.get(item.ticker);
      const entry = buildWatchlistEntry(symbol, candidate);
      watchlistDocument.tickers = [...(watchlistDocument.tickers ?? []), entry];
      watchlistTickers.add(item.ticker);

      reviewItems[item.ticker] = {
        ticker: item.ticker,
        status: "promoted",
        note: buildReviewNote(candidate, item.metrics),
        updatedAt: new Date().toISOString(),
        updatedBy: "auto-promotion"
      };

      let refreshDurationMs = null;
      try {
        refreshDurationMs = await runRefreshScript(item.ticker);
      } catch (error) {
        report.skipped.push({
          ticker: item.ticker,
          reason: error instanceof Error ? error.message : String(error)
        });
      }

      report.promoted.push({
        ticker: item.ticker,
        company: candidate.company,
        refreshDurationMs,
        note: reviewItems[item.ticker].note
      });
    }

    await writeJson(getWatchlistPath(), watchlistDocument);
    await writeJson(getReviewPath(), { items: reviewItems });
  }

  report.summary = {
    historyRunsAvailable: historyRuns.length,
    consideredCandidates: currentCandidates.length,
    qualifyingCandidates: report.qualifyingCandidates.length,
    promotedCount: report.promoted.length
  };
  report.completedAt = new Date().toISOString();

  await writeJson(getReportPath(), report);

  console.log(`[auto-promotion] qualifying: ${report.qualifyingCandidates.length}`);
  console.log(`[auto-promotion] promoted: ${report.promoted.length}`);
  console.log(`[auto-promotion] report: ${getReportPath()}`);
}

main().catch((error) => {
  console.error("[auto-promotion] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
