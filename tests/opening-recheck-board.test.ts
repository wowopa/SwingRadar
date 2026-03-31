import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearOpeningRecheckDecisions,
  listOpeningRecheckDecisions,
  saveOpeningRecheckDecision
} from "@/lib/server/opening-recheck-board";

describe("opening recheck board", () => {
  let tempDir = "";
  const previousBoardFile = process.env.SWING_RADAR_OPENING_RECHECK_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-opening-recheck-"));
    process.env.SWING_RADAR_OPENING_RECHECK_FILE = path.join(tempDir, "opening-recheck-board.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousBoardFile === undefined) {
      delete process.env.SWING_RADAR_OPENING_RECHECK_FILE;
    } else {
      process.env.SWING_RADAR_OPENING_RECHECK_FILE = previousBoardFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("saves, resets, and clears decisions by scan key", async () => {
    expect(await listOpeningRecheckDecisions("scan-a")).toEqual({});

    const firstDecision = await saveOpeningRecheckDecision({
      scanKey: "scan-a",
      ticker: "AAA001",
      status: "passed",
      suggestedStatus: "passed",
      checklist: {
        gap: "normal",
        confirmation: "confirmed",
        action: "review"
      },
      updatedBy: "admin-editor",
      note: "gap check passed"
    });
    await saveOpeningRecheckDecision({
      scanKey: "scan-a",
      ticker: "BBB001",
      status: "watch",
      suggestedStatus: "watch",
      checklist: {
        gap: "elevated",
        confirmation: "mixed",
        action: "watch"
      },
      updatedBy: "admin-editor"
    });

    expect(firstDecision).toMatchObject({
      ticker: "AAA001",
      status: "passed",
      suggestedStatus: "passed",
      updatedBy: "admin-editor",
      note: "gap check passed",
      checklist: {
        gap: "normal",
        confirmation: "confirmed",
        action: "review"
      }
    });
    expect(await listOpeningRecheckDecisions("scan-a")).toMatchObject({
      AAA001: {
        status: "passed",
        suggestedStatus: "passed",
        checklist: {
          gap: "normal",
          confirmation: "confirmed",
          action: "review"
        }
      },
      BBB001: {
        status: "watch",
        suggestedStatus: "watch",
        checklist: {
          gap: "elevated",
          confirmation: "mixed",
          action: "watch"
        }
      }
    });

    const clearedDecision = await saveOpeningRecheckDecision({
      scanKey: "scan-a",
      ticker: "AAA001",
      status: "pending",
      updatedBy: "admin-editor"
    });

    expect(clearedDecision).toBeNull();
    expect(await listOpeningRecheckDecisions("scan-a")).toMatchObject({
      BBB001: {
        status: "watch"
      }
    });

    await clearOpeningRecheckDecisions("scan-a");

    expect(await listOpeningRecheckDecisions("scan-a")).toEqual({});
  });
});
