import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export function getLiveSnapshotManifestPath(projectRoot) {
  return process.env.SWING_RADAR_LIVE_MANIFEST_FILE
    ? path.resolve(process.env.SWING_RADAR_LIVE_MANIFEST_FILE)
    : path.join(projectRoot, "data", "ops", "live-snapshot-manifest.json");
}

export function getLiveSnapshotRoot(projectRoot) {
  return process.env.SWING_RADAR_LIVE_SNAPSHOT_ROOT
    ? path.resolve(process.env.SWING_RADAR_LIVE_SNAPSHOT_ROOT)
    : path.join(projectRoot, "data", "live-snapshots");
}

export function getLiveSnapshotRetentionDays() {
  const value = Number(process.env.SWING_RADAR_LIVE_SNAPSHOT_RETENTION_DAYS ?? "7");
  if (!Number.isFinite(value) || value < 1) {
    return 7;
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
  const currentPath = path.resolve(currentDir);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let entries = [];
  try {
    entries = await readdir(snapshotRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const removed = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const snapshotDir = path.join(snapshotRoot, entry.name);
    if (path.resolve(snapshotDir) === currentPath) {
      continue;
    }

    try {
      const snapshotStat = await stat(snapshotDir);
      if (snapshotStat.mtimeMs < cutoff) {
        await rm(snapshotDir, { recursive: true, force: true });
        removed.push(snapshotDir);
      }
    } catch {
      // Keep snapshot promotion resilient even if cleanup fails.
    }
  }

  return removed;
}
