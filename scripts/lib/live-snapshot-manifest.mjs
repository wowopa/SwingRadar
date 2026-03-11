import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimePaths } from "./runtime-paths.mjs";

export function getLiveSnapshotManifestPath(projectRoot) {
  return process.env.SWING_RADAR_LIVE_MANIFEST_FILE
    ? path.resolve(process.env.SWING_RADAR_LIVE_MANIFEST_FILE)
    : path.join(getRuntimePaths(projectRoot).opsDir, "live-snapshot-manifest.json");
}

export function getLiveSnapshotRoot(projectRoot) {
  return process.env.SWING_RADAR_LIVE_SNAPSHOT_ROOT
    ? path.resolve(process.env.SWING_RADAR_LIVE_SNAPSHOT_ROOT)
    : getRuntimePaths(projectRoot).liveSnapshotRoot;
}

export function getLiveSnapshotRetentionDays() {
  const value = Number(process.env.SWING_RADAR_LIVE_SNAPSHOT_RETENTION_DAYS ?? "7");
  if (!Number.isFinite(value) || value < 1) {
    return 7;
  }

  return Math.floor(value);
}

export function getLiveSnapshotMaxCount() {
  const value = Number(process.env.SWING_RADAR_LIVE_SNAPSHOT_MAX_COUNT ?? "2");
  if (!Number.isFinite(value) || value < 1) {
    return 2;
  }

  return Math.floor(value);
}

export async function writeLiveSnapshotManifest(projectRoot, currentDir) {
  const manifestPath = getLiveSnapshotManifestPath(projectRoot);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        currentDir,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return manifestPath;
}

export async function pruneOldLiveSnapshots(projectRoot, currentDir) {
  const snapshotRoot = getLiveSnapshotRoot(projectRoot);
  const retentionDays = getLiveSnapshotRetentionDays();
  const maxCount = getLiveSnapshotMaxCount();
  const currentPath = path.resolve(currentDir);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let entries = [];
  try {
    entries = await readdir(snapshotRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const snapshots = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const snapshotDir = path.join(snapshotRoot, entry.name);
    try {
      const snapshotStat = await stat(snapshotDir);
      snapshots.push({
        dir: snapshotDir,
        resolvedDir: path.resolve(snapshotDir),
        mtimeMs: snapshotStat.mtimeMs
      });
    } catch {
      // Keep snapshot promotion resilient even if cleanup fails.
    }
  }

  const removed = [];
  const nonCurrentSnapshots = snapshots
    .filter((snapshot) => snapshot.resolvedDir !== currentPath)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  const retainedSnapshots = new Set(nonCurrentSnapshots.slice(0, Math.max(maxCount - 1, 0)).map((snapshot) => snapshot.resolvedDir));

  for (const snapshot of nonCurrentSnapshots) {
    const shouldRemoveByAge = snapshot.mtimeMs < cutoff;
    const shouldRemoveByCount = !retainedSnapshots.has(snapshot.resolvedDir);

    if (!shouldRemoveByAge && !shouldRemoveByCount) {
      continue;
    }

    try {
      await rm(snapshot.dir, { recursive: true, force: true });
      removed.push(snapshot.dir);
    } catch {
      // Keep snapshot promotion resilient even if cleanup fails.
    }
  }

  return removed;
}
