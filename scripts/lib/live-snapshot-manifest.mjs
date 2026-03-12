import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimePaths } from "./runtime-paths.mjs";

async function getDirectorySize(targetDir) {
  let total = 0;
  const entries = await readdir(targetDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    const entryStat = await stat(entryPath);

    if (entry.isDirectory()) {
      total += await getDirectorySize(entryPath);
      continue;
    }

    total += entryStat.size;
  }

  return total;
}

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

export function getLiveSnapshotMaxBytes() {
  const value = Number(process.env.SWING_RADAR_LIVE_SNAPSHOT_MAX_MB ?? "256");
  if (!Number.isFinite(value) || value < 1) {
    return 256 * 1024 * 1024;
  }

  return Math.floor(value * 1024 * 1024);
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
  const maxBytes = getLiveSnapshotMaxBytes();
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
        mtimeMs: snapshotStat.mtimeMs,
        sizeBytes: await getDirectorySize(snapshotDir)
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
  const remainingSnapshots = [];

  for (const snapshot of nonCurrentSnapshots) {
    const shouldRemoveByAge = snapshot.mtimeMs < cutoff;
    const shouldRemoveByCount = !retainedSnapshots.has(snapshot.resolvedDir);

    if (!shouldRemoveByAge && !shouldRemoveByCount) {
      remainingSnapshots.push(snapshot);
      continue;
    }

    try {
      await rm(snapshot.dir, { recursive: true, force: true });
      removed.push(snapshot.dir);
    } catch {
      // Keep snapshot promotion resilient even if cleanup fails.
      remainingSnapshots.push(snapshot);
    }
  }

  const currentSnapshot = snapshots.find((snapshot) => snapshot.resolvedDir === currentPath);
  const snapshotsByAge = [currentSnapshot, ...remainingSnapshots]
    .filter(Boolean)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  let totalBytes = snapshotsByAge.reduce((sum, snapshot) => sum + snapshot.sizeBytes, 0);

  for (let index = snapshotsByAge.length - 1; index >= 0 && totalBytes > maxBytes; index -= 1) {
    const snapshot = snapshotsByAge[index];
    if (snapshot.resolvedDir === currentPath) {
      continue;
    }

    try {
      await rm(snapshot.dir, { recursive: true, force: true });
      removed.push(snapshot.dir);
      totalBytes -= snapshot.sizeBytes;
    } catch {
      // Keep snapshot promotion resilient even if cleanup fails.
    }
  }

  return removed;
}
