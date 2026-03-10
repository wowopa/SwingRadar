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

async function readOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch {
    return fallback;
  }
}

function mergeUniqueEntries(target, seen, entries) {
  for (const item of entries ?? []) {
    if (!item?.ticker || seen.has(item.ticker)) {
      continue;
    }

    seen.add(item.ticker);
    target.push(item);
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
  const focused = [];
  const seen = new Set();

  mergeUniqueEntries(focused, seen, manualWatchlist.tickers);
  mergeUniqueEntries(
    focused,
    seen,
    (dailyCandidates.topCandidates ?? []).slice(0, recentCandidateCount).map((item) => universeMap.get(item.ticker)).filter(Boolean)
  );

  for (const run of (dailyCandidateHistory.runs ?? []).slice(0, recentHistoryRuns)) {
    mergeUniqueEntries(
      focused,
      seen,
      (run.topCandidates ?? []).slice(0, recentHistoryCandidatesPerRun).map((item) => universeMap.get(item.ticker)).filter(Boolean)
    );
  }

  mergeUniqueEntries(focused, seen, (universeWatchlist.tickers ?? []).slice(0, topUniverseCount));

  return focused;
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

    const focused = await loadFocusedWatchlist(configDir);
    return focused.filter((item) => item?.ticker && !replacementTickers.has(item.ticker));
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
