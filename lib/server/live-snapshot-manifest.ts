import { readFile, stat } from "fs/promises";
import path from "path";

type LiveSnapshotManifest = {
  currentDir?: string;
  updatedAt?: string;
};

export function getDefaultLiveDataDir() {
  return process.env.SWING_RADAR_DATA_DIR
    ? path.resolve(process.env.SWING_RADAR_DATA_DIR)
    : path.resolve(process.cwd(), "data/live");
}

export function getLiveSnapshotManifestPath() {
  return process.env.SWING_RADAR_LIVE_MANIFEST_FILE
    ? path.resolve(process.env.SWING_RADAR_LIVE_MANIFEST_FILE)
    : path.resolve(process.cwd(), "data/ops/live-snapshot-manifest.json");
}

export async function resolveLiveDataDir() {
  const fallbackDir = getDefaultLiveDataDir();
  let manifestDir: string | null = null;

  try {
    const payload = JSON.parse(await readFile(getLiveSnapshotManifestPath(), "utf8")) as LiveSnapshotManifest;
    if (typeof payload.currentDir === "string" && payload.currentDir.trim()) {
      manifestDir = path.isAbsolute(payload.currentDir)
        ? path.resolve(payload.currentDir)
        : path.resolve(process.cwd(), payload.currentDir);
    }
  } catch {
    return fallbackDir;
  }

  if (!manifestDir) {
    return fallbackDir;
  }

  try {
    const [fallbackStat, manifestStat] = await Promise.all([
      stat(path.join(fallbackDir, "recommendations.json")),
      stat(path.join(manifestDir, "recommendations.json"))
    ]);

    if (fallbackStat.mtimeMs > manifestStat.mtimeMs) {
      return fallbackDir;
    }
  } catch {
    return manifestDir;
  }

  return manifestDir;
}
