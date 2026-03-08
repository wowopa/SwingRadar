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
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.json();
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
  const payload = await readJson(watchlistFile);
  return payload.tickers ?? [];
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
