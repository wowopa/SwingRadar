import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function parseArgs(argv, defaults = {}) {
  const options = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      options[key] = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
    error.status = response.status;
    error.statusText = response.statusText;
    error.url = url;
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }

  return response.json();
}

export async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
    error.status = response.status;
    error.statusText = response.statusText;
    error.url = url;
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }

  return response.text();
}

export async function wait(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveProjectPath(projectRoot, configuredPath, fallbackPath) {
  if (!configuredPath) {
    return path.resolve(fallbackPath);
  }

  return path.isAbsolute(configuredPath)
    ? path.resolve(configuredPath)
    : path.resolve(projectRoot, configuredPath);
}

export function getProjectPaths(projectRoot) {
  return {
    rawDir: resolveProjectPath(projectRoot, process.env.SWING_RADAR_RAW_DATA_DIR, path.join(projectRoot, "data/raw")),
    liveDir: resolveProjectPath(projectRoot, process.env.SWING_RADAR_DATA_DIR, path.join(projectRoot, "data/live")),
    configDir: path.resolve(path.join(projectRoot, "data/config")),
    universeDir: path.resolve(path.join(projectRoot, "data/universe"))
  };
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function appendWatchlistReason(entry, reason) {
  if (!reason) {
    return;
  }

  const tags = Array.isArray(entry.watchlistSourceTags) ? [...entry.watchlistSourceTags] : [];
  const details = Array.isArray(entry.watchlistSourceDetails) ? [...entry.watchlistSourceDetails] : [];

  if (!tags.includes(reason.label)) {
    tags.push(reason.label);
  }

  if (!details.some((item) => item?.key === reason.key && item?.detail === reason.detail)) {
    details.push(reason);
  }

  entry.watchlistSourceTags = tags;
  entry.watchlistSourceDetails = details;
}

async function readOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch {
    return fallback;
  }
}

function mergeUniqueEntries(targetMap, entries, reasonFactory) {
  for (const item of entries ?? []) {
    if (!item?.ticker) {
      continue;
    }

    const reason = reasonFactory?.(item);
    const existing = targetMap.get(item.ticker);

    if (existing) {
      appendWatchlistReason(existing, reason);
      continue;
    }

    const next = { ...item };
    appendWatchlistReason(next, reason);
    targetMap.set(item.ticker, next);
  }
}

async function loadFocusedWatchlist(configDir) {
  const manualWatchlistFile = path.join(configDir, "watchlist.json");
  const universeWatchlistFile = path.join(configDir, "watchlist.universe.json");
  const universeDir = path.join(path.dirname(configDir), "universe");
  const dailyCandidatesFile = path.join(universeDir, "daily-candidates.json");
  const dailyCandidateHistoryFile = path.join(universeDir, "daily-candidates-history.json");

  const topUniverseCount = normalizePositiveInteger(process.env.SWING_RADAR_FOCUSED_WATCHLIST_TOP_UNIVERSE ?? "80", 80);
  const recentCandidateCount = normalizePositiveInteger(process.env.SWING_RADAR_FOCUSED_WATCHLIST_RECENT_CANDIDATES ?? "40", 40);
  const recentHistoryRuns = normalizePositiveInteger(process.env.SWING_RADAR_FOCUSED_WATCHLIST_RECENT_RUNS ?? "5", 5);
  const recentHistoryCandidatesPerRun = normalizePositiveInteger(
    process.env.SWING_RADAR_FOCUSED_WATCHLIST_RECENT_HISTORY_PER_RUN ?? "20",
    20
  );

  const [manualWatchlist, universeWatchlist, dailyCandidates, dailyCandidateHistory] = await Promise.all([
    readOptionalJson(manualWatchlistFile, { tickers: [] }),
    readOptionalJson(universeWatchlistFile, { tickers: [] }),
    readOptionalJson(dailyCandidatesFile, { topCandidates: [] }),
    readOptionalJson(dailyCandidateHistoryFile, { runs: [] })
  ]);

  const universeMap = new Map((universeWatchlist.tickers ?? []).map((item) => [item.ticker, item]));
  const focused = new Map();

  mergeUniqueEntries(focused, manualWatchlist.tickers, () => ({
    key: "manual-watchlist",
    label: "관심종목",
    detail: "수동 관심종목"
  }));
  mergeUniqueEntries(
    focused,
    (dailyCandidates.topCandidates ?? [])
      .slice(0, recentCandidateCount)
      .map((item, index) => ({
        ...(universeMap.get(item.ticker) ?? item),
        watchlistReasonDetail: `현재 후보 #${item.featuredRank ?? index + 1}`
      }))
      .filter((item) => item?.ticker),
    (item) => ({
      key: "recent-candidate",
      label: "최근후보",
      detail: item.watchlistReasonDetail ?? "최근 상위 후보"
    })
  );

  for (const run of (dailyCandidateHistory.runs ?? []).slice(0, recentHistoryRuns)) {
    mergeUniqueEntries(
      focused,
      (run.topCandidates ?? [])
        .slice(0, recentHistoryCandidatesPerRun)
        .map((item, index) => ({
          ...(universeMap.get(item.ticker) ?? item),
          watchlistReasonDetail: `${run.generatedAt?.slice(0, 10) ?? "최근"} 후보 #${item.featuredRank ?? index + 1}`
        }))
        .filter((item) => item?.ticker),
      (item) => ({
        key: "recent-candidate",
        label: "최근후보",
        detail: item.watchlistReasonDetail ?? "최근 후보 히스토리 포함"
      })
    );
  }

  mergeUniqueEntries(
    focused,
    (universeWatchlist.tickers ?? []).slice(0, topUniverseCount).map((item, index) => ({
      ...item,
      watchlistReasonDetail: `상위 유니버스 ${index + 1}위`
    })),
    (item) => ({
      key: "top-universe",
      label: "상위유니버스",
      detail: item.watchlistReasonDetail ?? "상위 유니버스"
    })
  );

  return Array.from(focused.values());
}

function getFocusedWatchlistReportPath(configDir) {
  const projectRoot = path.dirname(path.dirname(configDir));
  return path.join(projectRoot, "data", "ops", "latest-focused-watchlist.json");
}

async function writeFocusedWatchlistReport(configDir, entries) {
  const sourceCounts = entries.reduce(
    (acc, entry) => {
      for (const tag of entry.watchlistSourceTags ?? []) {
        acc[tag] = (acc[tag] ?? 0) + 1;
      }
      return acc;
    },
    {}
  );

  await writeJson(getFocusedWatchlistReportPath(configDir), {
    generatedAt: new Date().toISOString(),
    totalTickers: entries.length,
    sourceCounts,
    items: entries.map((entry) => ({
      ticker: entry.ticker,
      company: entry.company,
      sector: entry.sector,
      watchlistSourceTags: entry.watchlistSourceTags ?? [],
      watchlistSourceDetails: entry.watchlistSourceDetails ?? []
    }))
  });
}

export async function loadWatchlist(configDir) {
  const watchlistFile = process.env.SWING_RADAR_WATCHLIST_FILE
    ? path.resolve(process.env.SWING_RADAR_WATCHLIST_FILE)
    : path.join(configDir, "watchlist.json");
  const universeWatchlistFile = path.join(configDir, "watchlist.universe.json");
  const replacementFile = path.join(configDir, "symbol-replacements.json");
  const focusedEnabled = process.env.SWING_RADAR_FOCUSED_WATCHLIST_ENABLED === "true";

  if (!process.env.SWING_RADAR_WATCHLIST_FILE && focusedEnabled) {
    const replacementTickers = new Set();

    try {
      const replacements = await readJson(replacementFile);
      for (const item of replacements ?? []) {
        if (item?.ticker) {
          replacementTickers.add(item.ticker);
        }
      }
    } catch {
      // Optional file
    }

    const focused = (await loadFocusedWatchlist(configDir)).filter((item) => item?.ticker && !replacementTickers.has(item.ticker));
    await writeFocusedWatchlistReport(configDir, focused);
    return focused;
  }

  const sources = [watchlistFile];

  if (!process.env.SWING_RADAR_WATCHLIST_FILE) {
    sources.push(universeWatchlistFile);
  }

  const replacementTickers = new Set();

  try {
    const replacements = await readJson(replacementFile);
    for (const item of replacements ?? []) {
      if (item?.ticker) {
        replacementTickers.add(item.ticker);
      }
    }
  } catch {
    // Optional file
  }

  const merged = [];
  const seen = new Set();

  for (const filePath of sources) {
    try {
      const payload = await readJson(filePath);
      for (const item of payload.tickers ?? []) {
        if (!item?.ticker || replacementTickers.has(item.ticker) || seen.has(item.ticker)) {
          continue;
        }

        seen.add(item.ticker);
        merged.push(item);
      }
    } catch (error) {
      if (filePath !== universeWatchlistFile) {
        throw error;
      }
    }
  }

  return merged;
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function lastValid(values) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
