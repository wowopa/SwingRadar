import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type WatchlistSyncState = "idle" | "syncing" | "ready" | "failed";

export type WatchlistSyncStatus = {
  ticker: string;
  state: WatchlistSyncState;
  message: string;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastDurationMs: number | null;
};

type WatchlistSyncStatusDocument = {
  items: Record<string, WatchlistSyncStatus>;
};

function getWatchlistSyncStatusPath() {
  return process.env.SWING_RADAR_WATCHLIST_SYNC_STATUS_FILE
    ? path.resolve(process.env.SWING_RADAR_WATCHLIST_SYNC_STATUS_FILE)
    : path.resolve(process.cwd(), "data", "ops", "watchlist-sync-status.json");
}

async function loadDocument(): Promise<WatchlistSyncStatusDocument> {
  try {
    const content = await readFile(getWatchlistSyncStatusPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as WatchlistSyncStatusDocument;
  } catch {
    return { items: {} };
  }
}

async function saveDocument(document: WatchlistSyncStatusDocument) {
  await writeFile(getWatchlistSyncStatusPath(), `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

export async function listWatchlistSyncStatuses() {
  const document = await loadDocument();
  return document.items;
}

export async function getWatchlistSyncStatus(ticker: string) {
  const document = await loadDocument();
  return document.items[ticker];
}

export async function saveWatchlistSyncStatus(input: WatchlistSyncStatus) {
  const document = await loadDocument();
  document.items[input.ticker] = input;
  await saveDocument(document);
  return input;
}
