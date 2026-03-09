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
    configDir: path.resolve(path.join(projectRoot, "data/config"))
  };
}

export async function loadWatchlist(configDir) {
  const watchlistFile = process.env.SWING_RADAR_WATCHLIST_FILE
    ? path.resolve(process.env.SWING_RADAR_WATCHLIST_FILE)
    : path.join(configDir, "watchlist.json");
  const universeWatchlistFile = path.join(configDir, "watchlist.universe.json");
  const replacementFile = path.join(configDir, "symbol-replacements.json");
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
