import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

describe("fileDataProvider manifest resolution", () => {
  const originalDataDir = process.env.SWING_RADAR_DATA_DIR;
  const originalManifest = process.env.SWING_RADAR_LIVE_MANIFEST_FILE;
  let tempRoot = "";

  beforeEach(async () => {
    tempRoot = await import("fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(os.tmpdir(), "swing-radar-file-provider-")));
  });

  afterEach(async () => {
    if (originalDataDir === undefined) {
      delete process.env.SWING_RADAR_DATA_DIR;
    } else {
      process.env.SWING_RADAR_DATA_DIR = originalDataDir;
    }

    if (originalManifest === undefined) {
      delete process.env.SWING_RADAR_LIVE_MANIFEST_FILE;
    } else {
      process.env.SWING_RADAR_LIVE_MANIFEST_FILE = originalManifest;
    }

    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("reads from the manifest-selected live snapshot directory", async () => {
    const legacyDir = path.join(tempRoot, "live");
    const snapshotDir = path.join(tempRoot, "live-snapshots", "snapshot-20260309-021000");
    const manifestPath = path.join(tempRoot, "live-manifest.json");

    await mkdir(legacyDir, { recursive: true });
    await mkdir(snapshotDir, { recursive: true });

    await writeFile(
      path.join(legacyDir, "recommendations.json"),
      `${JSON.stringify({ generatedAt: "2026-03-09T00:00:00.000Z", items: [{ ticker: "OLD001" }] })}\n`,
      "utf8"
    );
    await writeFile(
      path.join(snapshotDir, "recommendations.json"),
      `${JSON.stringify({ generatedAt: "2026-03-09T02:10:00.000Z", items: [{ ticker: "NEW001" }] })}\n`,
      "utf8"
    );
    await writeFile(
      manifestPath,
      `${JSON.stringify({ currentDir: snapshotDir, updatedAt: "2026-03-09T02:10:00.000Z" })}\n`,
      "utf8"
    );

    process.env.SWING_RADAR_DATA_DIR = legacyDir;
    process.env.SWING_RADAR_LIVE_MANIFEST_FILE = manifestPath;

    const { fileDataProvider } = await import("@/lib/data-sources/file-provider");
    const result = await fileDataProvider.getRecommendations();

    expect(result.generatedAt).toBe("2026-03-09T02:10:00.000Z");
    expect(result.items[0]?.ticker).toBe("NEW001");
  });
});
