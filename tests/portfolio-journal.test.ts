import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  appendPortfolioTradeEventForUser,
  createEmptyPortfolioJournal,
  loadPortfolioJournalForUser,
  savePortfolioJournalForUser
} from "@/lib/server/portfolio-journal";

describe("portfolio journal storage", () => {
  let tempDir = "";
  const previousJournalFile = process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-portfolio-journal-"));
    process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE = path.join(tempDir, "portfolio-journals.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousJournalFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE = previousJournalFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns an empty journal when nothing is saved", async () => {
    const journal = await loadPortfolioJournalForUser("user-1");
    expect(journal).toEqual(createEmptyPortfolioJournal());
  });

  it("stores normalized trade events separately for each user", async () => {
    await appendPortfolioTradeEventForUser("user-1", {
      ticker: "005930",
      type: "buy",
      quantity: 5,
      price: 71000,
      fees: 0,
      tradedAt: "2026-03-31T09:05:00+09:00",
      note: "first buy",
      createdBy: "tester@example.com"
    });

    await appendPortfolioTradeEventForUser("user-1", {
      ticker: "005930",
      type: "take_profit_partial",
      quantity: 2,
      price: 76000,
      fees: 500,
      tradedAt: "2026-04-02T13:10:00+09:00",
      note: "trimmed",
      createdBy: "tester@example.com"
    });

    const userJournal = await loadPortfolioJournalForUser("user-1");
    const otherJournal = await loadPortfolioJournalForUser("user-2");

    expect(userJournal.events).toHaveLength(2);
    expect(userJournal.events[0]).toMatchObject({
      ticker: "005930",
      company: "삼성전자",
      type: "take_profit_partial",
      quantity: 2,
      price: 76000,
      fees: 500
    });
    expect(userJournal.events[1]).toMatchObject({
      ticker: "005930",
      type: "buy",
      quantity: 5,
      price: 71000
    });
    expect(otherJournal).toEqual(createEmptyPortfolioJournal());
  });

  it("can overwrite the journal for immediate undo flows", async () => {
    const appended = await appendPortfolioTradeEventForUser("user-1", {
      ticker: "005930",
      type: "buy",
      quantity: 5,
      price: 71000,
      fees: 0,
      tradedAt: "2026-03-31T09:05:00+09:00",
      note: "first buy",
      createdBy: "tester@example.com"
    });

    const restored = await savePortfolioJournalForUser("user-1", createEmptyPortfolioJournal());
    const reloaded = await loadPortfolioJournalForUser("user-1");

    expect(appended.journal.events).toHaveLength(1);
    expect(restored.events).toHaveLength(0);
    expect(reloaded).toEqual(createEmptyPortfolioJournal());
  });
});
