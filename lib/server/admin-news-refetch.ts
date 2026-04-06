import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { ApiError } from "@/lib/server/api-error";
import { loadNewsFetchReport } from "@/lib/server/ops-reports";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();

let activeRefetch: Promise<AdminNewsRefetchResult> | null = null;

export type AdminNewsRefetchResult = {
  scope: "top-candidate-missing";
  requestedTickers: string[];
  missingTickersBefore: string[];
  missingTickersAfter: string[];
  resolvedTickers: string[];
  scripts: Array<{
    name: string;
    durationMs: number;
  }>;
  reportStartedAt: string | null;
  reportCompletedAt: string | null;
  noop: boolean;
};

function normalizeTickerList(tickers: string[]) {
  return [...new Set(tickers.map((value) => value.trim().toUpperCase()).filter(Boolean))];
}

function extractMissingTopCandidateTickers(report: Awaited<ReturnType<typeof loadNewsFetchReport>>) {
  return normalizeTickerList(
    (report?.topCandidateCoverage?.tickers ?? [])
      .filter((item) => item.source === "missing")
      .map((item) => item.ticker)
  );
}

async function runNodeScript(scriptName: string) {
  const startedAt = Date.now();
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName)], {
    cwd: projectRoot,
    env: process.env
  });

  return {
    name: scriptName,
    durationMs: Date.now() - startedAt
  };
}

async function runRefetch(requestedTickers: string[]): Promise<AdminNewsRefetchResult> {
  const beforeReport = await loadNewsFetchReport();
  const missingTickersBefore = extractMissingTopCandidateTickers(beforeReport);
  const requested = normalizeTickerList(requestedTickers);
  const effectiveRequestedTickers =
    requested.length > 0 ? missingTickersBefore.filter((ticker) => requested.includes(ticker)) : missingTickersBefore;

  if (effectiveRequestedTickers.length === 0) {
    return {
      scope: "top-candidate-missing",
      requestedTickers: requested.length > 0 ? requested : missingTickersBefore,
      missingTickersBefore,
      missingTickersAfter: missingTickersBefore,
      resolvedTickers: [],
      scripts: [],
      reportStartedAt: beforeReport?.startedAt ?? null,
      reportCompletedAt: beforeReport?.completedAt ?? null,
      noop: true
    };
  }

  const scripts = [
    await runNodeScript("fetch-news-source.mjs"),
    await runNodeScript("sync-external-raw.mjs")
  ];

  const afterReport = await loadNewsFetchReport();
  const missingTickersAfter = extractMissingTopCandidateTickers(afterReport);

  return {
    scope: "top-candidate-missing",
    requestedTickers: effectiveRequestedTickers,
    missingTickersBefore,
    missingTickersAfter,
    resolvedTickers: effectiveRequestedTickers.filter((ticker) => !missingTickersAfter.includes(ticker)),
    scripts,
    reportStartedAt: afterReport?.startedAt ?? null,
    reportCompletedAt: afterReport?.completedAt ?? null,
    noop: false
  };
}

export async function refetchTopCandidateMissingNews(requestedTickers: string[] = []) {
  if (activeRefetch) {
    throw new ApiError(409, "ADMIN_NEWS_REFETCH_RUNNING", "A top-candidate news refetch is already running.");
  }

  activeRefetch = runRefetch(requestedTickers);

  try {
    return await activeRefetch;
  } finally {
    activeRefetch = null;
  }
}
