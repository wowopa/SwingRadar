import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUserSession: vi.fn(),
  appendPortfolioTradeEventForUser: vi.fn(),
  loadPortfolioJournalForUser: vi.fn(),
  savePortfolioJournalForUser: vi.fn(),
  loadPortfolioProfileForUser: vi.fn(),
  savePortfolioProfileForUser: vi.fn(),
  syncPortfolioProfileWithTradeEventForUser: vi.fn()
}));

vi.mock("@/lib/server/user-auth", () => ({
  requireUserSession: mocks.requireUserSession
}));

vi.mock("@/lib/server/portfolio-journal", () => ({
  appendPortfolioTradeEventForUser: mocks.appendPortfolioTradeEventForUser,
  loadPortfolioJournalForUser: mocks.loadPortfolioJournalForUser,
  savePortfolioJournalForUser: mocks.savePortfolioJournalForUser
}));

vi.mock("@/lib/server/portfolio-profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/portfolio-profile")>(
    "@/lib/server/portfolio-profile"
  );
  return {
    ...actual,
    loadPortfolioProfileForUser: mocks.loadPortfolioProfileForUser,
    savePortfolioProfileForUser: mocks.savePortfolioProfileForUser,
    syncPortfolioProfileWithTradeEventForUser: mocks.syncPortfolioProfileWithTradeEventForUser
  };
});

import { PATCH as patchPortfolioJournalRoute, POST as postPortfolioJournalRoute } from "@/app/api/account/portfolio-journal/route";
import { applyTradeEventToPortfolioProfile, createEmptyPortfolioProfile } from "@/lib/server/portfolio-profile";

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

async function parseJson<T>(response: Response): Promise<T> {
  return JSON.parse(await response.text()) as T;
}

describe("portfolio journal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "tester@example.com"
      }
    });
    mocks.savePortfolioProfileForUser.mockImplementation((_userId: string, profile: unknown) => Promise.resolve(profile));
  });

  it("returns a write-path snapshot for synced append flows", async () => {
    const previousProfile = {
      ...createEmptyPortfolioProfile(),
      totalCapital: 1_000_000,
      availableCash: 1_000_000
    };
    const previousJournal = {
      events: [],
      updatedAt: "2026-04-05T00:00:00.000Z",
      updatedBy: "tester@example.com"
    };
    const event = {
      id: "evt-buy-1",
      ticker: "005930",
      company: "Samsung Electronics",
      sector: "Semiconductor",
      type: "buy" as const,
      quantity: 10,
      price: 10_000,
      fees: 1_000,
      tradedAt: "2026-04-05T09:05:00.000Z",
      note: "first entry",
      createdAt: "2026-04-05T09:05:01.000Z",
      createdBy: "tester@example.com"
    };
    const nextJournal = {
      events: [event],
      updatedAt: "2026-04-05T09:05:01.000Z",
      updatedBy: "tester@example.com"
    };
    const syncedProfile = applyTradeEventToPortfolioProfile(
      previousProfile,
      {
        ticker: event.ticker,
        type: event.type,
        quantity: event.quantity,
        price: event.price,
        fees: event.fees,
        tradedAt: event.tradedAt,
        note: event.note
      },
      event.createdBy
    );

    mocks.loadPortfolioJournalForUser.mockResolvedValue(previousJournal);
    mocks.loadPortfolioProfileForUser.mockResolvedValue(previousProfile);
    mocks.appendPortfolioTradeEventForUser.mockResolvedValue({
      event,
      journal: nextJournal
    });
    mocks.syncPortfolioProfileWithTradeEventForUser.mockResolvedValue(syncedProfile);

    const response = await postPortfolioJournalRoute(
      createRequest("http://localhost/api/account/portfolio-journal", {
        method: "POST",
        body: JSON.stringify({
          ticker: event.ticker,
          type: event.type,
          quantity: event.quantity,
          price: event.price,
          fees: event.fees,
          tradedAt: event.tradedAt,
          note: event.note,
          syncProfilePosition: true
        })
      })
    );
    const payload = await parseJson<{
      ok: boolean;
      consistency: { status: string; issueCount: number };
      writePath: {
        action: string;
        previousEventCount: number;
        nextEventCount: number;
        cashAligned: boolean | null;
        consistencyIssueCount: number;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      consistency: {
        status: "aligned",
        issueCount: 0
      },
      writePath: {
        action: "append",
        previousEventCount: 0,
        nextEventCount: 1,
        cashAligned: true,
        consistencyIssueCount: 0
      }
    });
  });

  it("returns a write-path snapshot for latest-event undo flows", async () => {
    const previousProfile = {
      ...createEmptyPortfolioProfile(),
      totalCapital: 1_000_000,
      availableCash: 1_000_000
    };
    const latestEvent = {
      id: "evt-buy-1",
      ticker: "005930",
      company: "Samsung Electronics",
      sector: "Semiconductor",
      type: "buy" as const,
      quantity: 10,
      price: 10_000,
      fees: 1_000,
      tradedAt: "2026-04-05T09:05:00.000Z",
      note: "first entry",
      createdAt: "2026-04-05T09:05:01.000Z",
      createdBy: "tester@example.com"
    };
    const currentProfile = applyTradeEventToPortfolioProfile(
      previousProfile,
      {
        ticker: latestEvent.ticker,
        type: latestEvent.type,
        quantity: latestEvent.quantity,
        price: latestEvent.price,
        fees: latestEvent.fees,
        tradedAt: latestEvent.tradedAt,
        note: latestEvent.note
      },
      latestEvent.createdBy
    );
    const currentJournal = {
      events: [latestEvent],
      updatedAt: "2026-04-05T09:05:01.000Z",
      updatedBy: "tester@example.com"
    };
    const revertedJournal = {
      events: [],
      updatedAt: "2026-04-05T09:06:00.000Z",
      updatedBy: "tester@example.com"
    };

    mocks.loadPortfolioJournalForUser.mockResolvedValue(currentJournal);
    mocks.loadPortfolioProfileForUser.mockResolvedValue(currentProfile);
    mocks.savePortfolioJournalForUser.mockResolvedValue(revertedJournal);

    const response = await patchPortfolioJournalRoute(
      createRequest("http://localhost/api/account/portfolio-journal", {
        method: "PATCH",
        body: JSON.stringify({
          eventId: latestEvent.id,
          journal: revertedJournal,
          profile: previousProfile
        })
      })
    );
    const payload = await parseJson<{
      ok: boolean;
      consistency: { status: string; issueCount: number };
      writePath: {
        action: string;
        previousEventCount: number;
        nextEventCount: number;
        cashAligned: boolean | null;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      consistency: {
        status: "aligned",
        issueCount: 0
      },
      writePath: {
        action: "undo",
        previousEventCount: 1,
        nextEventCount: 0,
        cashAligned: true
      }
    });
  });

  it("rejects undo requests for non-latest events", async () => {
    mocks.loadPortfolioJournalForUser.mockResolvedValue({
      events: [
        {
          id: "evt-latest",
          ticker: "005930",
          company: "Samsung Electronics",
          sector: "Semiconductor",
          type: "buy",
          quantity: 10,
          price: 10_000,
          fees: 1_000,
          tradedAt: "2026-04-05T09:05:00.000Z",
          createdAt: "2026-04-05T09:05:01.000Z",
          createdBy: "tester@example.com"
        }
      ],
      updatedAt: "2026-04-05T09:05:01.000Z",
      updatedBy: "tester@example.com"
    });
    mocks.loadPortfolioProfileForUser.mockResolvedValue(createEmptyPortfolioProfile());

    const response = await patchPortfolioJournalRoute(
      createRequest("http://localhost/api/account/portfolio-journal", {
        method: "PATCH",
        body: JSON.stringify({
          eventId: "evt-old",
          journal: {
            events: [],
            updatedAt: "2026-04-05T09:06:00.000Z",
            updatedBy: "tester@example.com"
          }
        })
      })
    );
    const payload = await parseJson<{ code: string }>(response);

    expect(response.status).toBe(409);
    expect(payload.code).toBe("LATEST_EVENT_ONLY");
  });
});
