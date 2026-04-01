import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearUserOpeningRecheckDecisions,
  listUserOpeningRecheckDecisions,
  saveUserOpeningRecheckDecision
} from "@/lib/server/user-opening-recheck-board";

describe("user opening recheck board", () => {
  let tempDir = "";
  const previousBoardFile = process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-user-opening-recheck-"));
    process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE = path.join(tempDir, "user-opening-recheck-board.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousBoardFile === undefined) {
      delete process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE;
    } else {
      process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE = previousBoardFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("stores opening decisions separately for each user", async () => {
    await saveUserOpeningRecheckDecision({
      userId: "user-1",
      scanKey: "scan-a",
      ticker: "AAA001",
      status: "passed",
      suggestedStatus: "passed",
      checklist: {
        gap: "normal",
        confirmation: "confirmed",
        action: "review"
      },
      updatedBy: "user-1@example.com",
      note: "good open"
    });

    await saveUserOpeningRecheckDecision({
      userId: "user-2",
      scanKey: "scan-a",
      ticker: "AAA001",
      status: "avoid",
      suggestedStatus: "avoid",
      checklist: {
        gap: "overheated",
        confirmation: "mixed",
        action: "hold"
      },
      updatedBy: "user-2@example.com"
    });

    expect(await listUserOpeningRecheckDecisions("user-1", "scan-a")).toMatchObject({
      AAA001: {
        status: "passed",
        updatedBy: "user-1@example.com",
        note: "good open"
      }
    });
    expect(await listUserOpeningRecheckDecisions("user-2", "scan-a")).toMatchObject({
      AAA001: {
        status: "avoid",
        updatedBy: "user-2@example.com"
      }
    });
  });

  it("clears only the requested user scan", async () => {
    await saveUserOpeningRecheckDecision({
      userId: "user-1",
      scanKey: "scan-a",
      ticker: "AAA001",
      status: "watch",
      suggestedStatus: "watch",
      checklist: {
        gap: "elevated",
        confirmation: "mixed",
        action: "watch"
      },
      updatedBy: "user-1@example.com"
    });

    await saveUserOpeningRecheckDecision({
      userId: "user-1",
      scanKey: "scan-b",
      ticker: "BBB001",
      status: "passed",
      suggestedStatus: "passed",
      checklist: {
        gap: "normal",
        confirmation: "confirmed",
        action: "review"
      },
      updatedBy: "user-1@example.com"
    });

    await clearUserOpeningRecheckDecisions("user-1", "scan-a");

    expect(await listUserOpeningRecheckDecisions("user-1", "scan-a")).toEqual({});
    expect(await listUserOpeningRecheckDecisions("user-1", "scan-b")).toMatchObject({
      BBB001: {
        status: "passed"
      }
    });
  });
});
