import { mkdir, writeFile } from "node:fs/promises";
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
