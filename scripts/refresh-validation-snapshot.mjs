import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, parseArgs, writeJson } from "./lib/external-source-utils.mjs";
import { getRuntimePaths } from "./lib/runtime-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const { Client } = pg;

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR validation snapshot refresh

Usage:
  node scripts/refresh-validation-snapshot.mjs [--out-file <path>] [--lookback-runs <number>]
`);
}

async function readJson(filePath, fallback = null) {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function formatPercent(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function resolveObservationWindow(sampleSize, hitRate) {
  if (sampleSize >= 35) return "5~15거래일";
  if (sampleSize >= 24 || hitRate >= 55) return "3~10거래일";
  return "1~7거래일";
}

function buildValidationSummary(item) {
  const tone =
    item.hitRate >= 58 && item.avgReturn > 0
      ? "비슷한 흐름에서 비교적 좋은 결과가 자주 나왔습니다."
      : item.hitRate >= 48 && item.avgReturn >= 0
        ? "무리하게 들어가기보다 가격 확인 후 보는 편이 더 안전합니다."
        : "결과 차이가 큰 편이라 서두르지 말고 천천히 보는 편이 좋습니다.";

  return `비슷한 흐름 ${item.sampleSize}건 기준 성공률 ${item.hitRate}%, 평균 움직임 ${formatPercent(item.avgReturn)}, 가장 크게 밀린 폭 ${formatPercent(item.maxDrawdown)}입니다. ${tone}`;
}

function normalizeMeasuredItem(item) {
  const normalized = {
    ticker: item.ticker,
    hitRate: clamp(Math.round(Number(item.hitRate ?? 50)), 20, 90),
    avgReturn: roundNumber(Number(item.avgReturn ?? 0), 1) ?? 0,
    sampleSize: clamp(Math.round(Number(item.sampleSize ?? 12)), 1, 200),
    maxDrawdown: roundNumber(Number(item.maxDrawdown ?? -4), 1) ?? -4
  };

  return {
    ...normalized,
    basis: item.basis ?? "실측 기반",
    observationWindow: item.observationWindow ?? resolveObservationWindow(normalized.sampleSize, normalized.hitRate),
    validationSummary: item.validationSummary ?? buildValidationSummary(normalized)
  };
}

function buildHistoryMetrics(runs, ticker) {
  const appearances = [];

  for (const run of runs) {
    const topCandidates = Array.isArray(run.topCandidates) ? run.topCandidates : [];
    const match = topCandidates.find((item) => item.ticker === ticker);
    if (!match) {
      continue;
    }

    appearances.push({
      generatedAt: run.generatedAt,
      rank: topCandidates.findIndex((item) => item.ticker === ticker) + 1,
      candidateScore: Number(match.candidateScore ?? 0),
      score: Number(match.score ?? 0),
      signalTone: match.signalTone ?? "주의",
      averageTurnover20: Number(match.averageTurnover20 ?? 0),
      volumeRatio: Number(match.volumeRatio ?? 1),
      currentPrice: Number(match.currentPrice ?? 0)
    });
  }

  if (!appearances.length) {
    return null;
  }

  let consecutiveRecentAppearances = 0;
  for (const run of runs) {
    const topCandidates = Array.isArray(run.topCandidates) ? run.topCandidates : [];
    const exists = topCandidates.some((item) => item.ticker === ticker);
    if (!exists) {
      break;
    }
    consecutiveRecentAppearances += 1;
  }

  const average = (field) =>
    appearances.reduce((sum, item) => sum + item[field], 0) / Math.max(appearances.length, 1);

  const positiveCount = appearances.filter((item) => item.signalTone === "긍정").length;
  const neutralCount = appearances.filter((item) => item.signalTone === "중립").length;
  const cautionCount = appearances.filter((item) => item.signalTone === "주의").length;

  return {
    appearanceCount: appearances.length,
    consecutiveRecentAppearances,
    bestRank: Math.min(...appearances.map((item) => item.rank)),
    averageRank: average("rank"),
    averageCandidateScore: average("candidateScore"),
    latestCandidateScore: appearances[0]?.candidateScore ?? 0,
    averageScore: average("score"),
    averageTurnover20: average("averageTurnover20"),
    averageVolumeRatio: average("volumeRatio"),
    positiveCount,
    neutralCount,
    cautionCount
  };
}

function buildDerivedHistoryValidation(ticker, metrics) {
  const positiveRate = metrics.positiveCount / Math.max(metrics.appearanceCount, 1);
  const cautionRate = metrics.cautionCount / Math.max(metrics.appearanceCount, 1);
  const sampleSize = clamp(
    Math.round(8 + metrics.appearanceCount * 3 + metrics.consecutiveRecentAppearances * 2 + positiveRate * 6),
    8,
    36
  );
  const hitRate = clamp(
    Math.round(
      44 +
        (Math.max(0, 25 - metrics.averageRank) * 0.7) +
        (metrics.averageCandidateScore - 140) / 10 +
        positiveRate * 5 -
        cautionRate * 4
    ),
    42,
    68
  );
  const avgReturn = clamp(
    roundNumber(
      (metrics.averageCandidateScore - 150) / 14 + (metrics.averageVolumeRatio - 1) * 2.2 + positiveRate * 2.2 - cautionRate * 1.2,
      1
    ) ?? 0,
    -3.5,
    9
  );
  const maxDrawdown = roundNumber(-clamp(2.5 + metrics.averageRank / 14 + cautionRate * 2.2 - positiveRate, 2.5, 9), 1) ?? -4.5;

  return {
    ticker,
    hitRate,
    avgReturn,
    sampleSize,
    maxDrawdown,
    basis: "유사 흐름 참고",
    observationWindow: resolveObservationWindow(sampleSize, hitRate),
    validationSummary: `최근 ${metrics.appearanceCount}번 상위 후보에 들었고 평균 순위는 ${Math.round(metrics.averageRank)}위였습니다. 반복해서 상위권에 오른 흐름을 기준으로 참고값을 만들었습니다.`
  };
}

function buildTrackingValidation(entry) {
  const entryPrice = Number(entry.entryPrice ?? 0);
  const currentPrice = Number(entry.currentPrice ?? entryPrice);
  const highestPrice = Number(entry.highestPrice ?? currentPrice);
  const lowestPrice = Number(entry.lowestPrice ?? currentPrice);
  const activationScore = Number(entry.activationScore ?? 70);
  const appearances = Number(entry.appearances ?? 1);
  const holdingDays = Number(entry.holdingDays ?? 1);
  const mfe = entryPrice > 0 ? ((highestPrice - entryPrice) / entryPrice) * 100 : 0;
  const mae = entryPrice > 0 ? ((lowestPrice - entryPrice) / entryPrice) * 100 : 0;
  const currentReturn = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
  const statusBoost = entry.status === "closed_win" ? 8 : entry.status === "closed_loss" ? -10 : entry.status === "closed_timeout" ? -3 : 0;
  const sampleSize = clamp(Math.round(10 + appearances * 3 + holdingDays), 10, 30);
  const hitRate = clamp(Math.round(47 + activationScore / 5 + Math.max(0, mfe) * 0.25 + statusBoost), 40, 72);
  const avgReturn = clamp(roundNumber(currentReturn * 0.45 + mfe * 0.35 + mae * 0.2, 1) ?? 0, -4.5, 10);
  const maxDrawdown = roundNumber(Math.min(mae, -0.5), 1) ?? -1;

  return {
    ticker: entry.ticker,
    hitRate,
    avgReturn,
    sampleSize,
    maxDrawdown,
    basis: "공용 추적 참고",
    observationWindow: resolveObservationWindow(sampleSize, hitRate),
    validationSummary: `공용 추적 진입 후 ${holdingDays}거래일 동안의 흐름을 참고했습니다. 시작가 대비 최고 ${formatPercent(mfe)}, 최저 ${formatPercent(mae)}, 현재 ${formatPercent(currentReturn)} 수준입니다.`
  };
}

async function persistValidationSnapshot(document) {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return;
  }

  const client = new Client({
    connectionString: process.env.SWING_RADAR_DATABASE_URL,
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(`
      create table if not exists runtime_documents (
        name text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
    await client.query(
      `
      insert into runtime_documents (name, payload, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (name)
      do update set payload = excluded.payload, updated_at = now()
      `,
      ["validation-snapshot", JSON.stringify(document)]
    );
  } finally {
    await client.end();
  }
}

async function main() {
  const defaults = getProjectPaths(projectRoot);
  const options = parseArgs(process.argv.slice(2), {
    outFile: path.join(defaults.rawDir, "validation-snapshot.json"),
    lookbackRuns: "30",
    minAppearances: "2"
  });

  if (options.help) {
    printHelp();
    return;
  }

  const outFile = path.resolve(options.outFile);
  const lookbackRuns = clamp(Number.parseInt(String(options.lookbackRuns), 10) || 30, 5, 90);
  const minAppearances = clamp(Number.parseInt(String(options.minAppearances), 10) || 2, 1, 10);

  const [existing, history, trackingState] = await Promise.all([
    readJson(path.join(defaults.rawDir, "validation-snapshot.json"), { items: [] }),
      readJson(path.join(getRuntimePaths(projectRoot).universeDir, "daily-candidates-history.json"), { runs: [] }),
      readJson(path.join(getRuntimePaths(projectRoot).trackingDir, "service-tracking-state.json"), { entries: [] })
  ]);

  const itemsByTicker = new Map();

  for (const item of existing.items ?? []) {
    if (!item?.ticker) {
      continue;
    }
    itemsByTicker.set(item.ticker, normalizeMeasuredItem(item));
  }

  const runs = Array.isArray(history.runs) ? history.runs.slice(0, lookbackRuns) : [];
  const tickers = new Set();
  for (const run of runs) {
    for (const item of run.topCandidates ?? []) {
      if (item?.ticker) {
        tickers.add(item.ticker);
      }
    }
  }

  for (const ticker of tickers) {
    if (itemsByTicker.has(ticker)) {
      continue;
    }

    const metrics = buildHistoryMetrics(runs, ticker);
    if (!metrics || metrics.appearanceCount < minAppearances) {
      continue;
    }

    itemsByTicker.set(ticker, buildDerivedHistoryValidation(ticker, metrics));
  }

  for (const entry of trackingState.entries ?? []) {
    if (!entry?.ticker) {
      continue;
    }
    if (entry.status === "watch" || entry.status === "active") {
      continue;
    }

    const existingItem = itemsByTicker.get(entry.ticker);
    if (existingItem?.basis === "실측 기반") {
      continue;
    }

    itemsByTicker.set(entry.ticker, buildTrackingValidation(entry));
  }

  const items = Array.from(itemsByTicker.values()).sort((left, right) => left.ticker.localeCompare(right.ticker, "en"));

  const document = {
    asOf: new Date().toISOString(),
    lookbackRuns,
    items
  };

  await writeJson(outFile, document);
  await persistValidationSnapshot(document);

  console.log("Validation snapshot refresh completed.");
  console.log(`- items: ${items.length}`);
  console.log(`- outFile: ${outFile}`);
}

main().catch((error) => {
  console.error("Validation snapshot refresh failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
