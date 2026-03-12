import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { getRuntimePaths } from "./runtime-paths.mjs";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

async function collectDirectoryStats(targetDir) {
  const summary = {
    path: targetDir,
    exists: false,
    fileCount: 0,
    dirCount: 0,
    sizeBytes: 0,
    sizeLabel: "0 B",
    newestMtime: null
  };

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const entryStat = await stat(entryPath);

      if (!summary.newestMtime || entryStat.mtimeMs > Date.parse(summary.newestMtime)) {
        summary.newestMtime = new Date(entryStat.mtimeMs).toISOString();
      }

      if (entry.isDirectory()) {
        summary.dirCount += 1;
        await walk(entryPath);
        continue;
      }

      summary.fileCount += 1;
      summary.sizeBytes += entryStat.size;
    }
  }

  try {
    const rootStat = await stat(targetDir);
    summary.exists = true;
    summary.newestMtime = new Date(rootStat.mtimeMs).toISOString();
    await walk(targetDir);
  } catch {
    return summary;
  }

  summary.sizeLabel = formatBytes(summary.sizeBytes);
  return summary;
}

export function getRuntimeStorageReportPath(projectRoot) {
  return process.env.SWING_RADAR_RUNTIME_STORAGE_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_RUNTIME_STORAGE_REPORT_PATH)
    : path.join(getRuntimePaths(projectRoot).opsDir, "latest-runtime-storage.json");
}

export async function writeRuntimeStorageReport(projectRoot, metadata = {}) {
  const runtimePaths = getRuntimePaths(projectRoot);
  const sections = {
    runtimeRoot: runtimePaths.runtimeRoot,
    raw: runtimePaths.rawDir,
    live: runtimePaths.liveDir,
    liveSnapshots: runtimePaths.liveSnapshotRoot,
    ops: runtimePaths.opsDir,
    universe: runtimePaths.universeDir,
    tracking: runtimePaths.trackingDir,
    history: runtimePaths.historyDir,
    admin: runtimePaths.adminDir,
    runtimeConfig: runtimePaths.runtimeConfigDir
  };

  const details = Object.fromEntries(
    await Promise.all(
      Object.entries(sections).map(async ([key, targetDir]) => [key, await collectDirectoryStats(targetDir)])
    )
  );

  const totalSizeBytes = Object.values(details).reduce((sum, item) => sum + item.sizeBytes, 0);
  const totalFiles = Object.values(details).reduce((sum, item) => sum + item.fileCount, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    runtimeRoot: runtimePaths.runtimeRoot,
    totalSizeBytes,
    totalSizeLabel: formatBytes(totalSizeBytes),
    totalFiles,
    sections: details,
    metadata
  };

  const reportPath = getRuntimeStorageReportPath(projectRoot);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
