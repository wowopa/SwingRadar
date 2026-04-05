import { applyTradeEventToPortfolioProfile } from "@/lib/server/portfolio-profile";
import type { PortfolioStateConsistencyReport } from "@/lib/portfolio/portfolio-state-consistency";
import type { PortfolioJournal, PortfolioProfile, PortfolioTradeEvent } from "@/types/recommendation";

export interface PortfolioWritePathSnapshot {
  action: "append" | "undo";
  latestEventId: string | null;
  eventTicker: string | null;
  previousEventCount: number;
  nextEventCount: number;
  profilePositionCount: number;
  consistencyStatus: PortfolioStateConsistencyReport["status"];
  consistencyIssueCount: number;
  actualCashAfterWrite: number | null;
  expectedCashAfterWrite: number | null;
  cashAligned: boolean | null;
  cashExpectationSource: "sync_from_previous_profile" | "undo_previous_profile" | "not_checked";
}

function resolveCashAlignment(left: number | null, right: number | null) {
  if (left === null || right === null) {
    return null;
  }

  return Math.abs(left - right) <= 1;
}

export function buildPortfolioWritePathSnapshot(args: {
  action: "append" | "undo";
  previousJournal: PortfolioJournal;
  nextJournal: PortfolioJournal;
  finalProfile: PortfolioProfile;
  consistency: PortfolioStateConsistencyReport;
  event?: PortfolioTradeEvent | null;
  previousProfile?: PortfolioProfile | null;
  undoProfile?: PortfolioProfile | null;
  syncProfilePosition?: boolean;
}): PortfolioWritePathSnapshot {
  let expectedCashAfterWrite: number | null = null;
  let cashExpectationSource: PortfolioWritePathSnapshot["cashExpectationSource"] = "not_checked";

  if (args.action === "append" && args.event && args.previousProfile && args.syncProfilePosition) {
    expectedCashAfterWrite = applyTradeEventToPortfolioProfile(
      args.previousProfile,
      {
        ticker: args.event.ticker,
        type: args.event.type,
        quantity: args.event.quantity,
        price: args.event.price,
        fees: args.event.fees,
        tradedAt: args.event.tradedAt,
        note: args.event.note
      },
      args.event.createdBy
    ).availableCash;
    cashExpectationSource = "sync_from_previous_profile";
  } else if (args.action === "undo" && args.undoProfile) {
    expectedCashAfterWrite = args.undoProfile.availableCash;
    cashExpectationSource = "undo_previous_profile";
  }

  return {
    action: args.action,
    latestEventId: args.nextJournal.events[0]?.id ?? null,
    eventTicker: args.event?.ticker ?? args.nextJournal.events[0]?.ticker ?? null,
    previousEventCount: args.previousJournal.events.length,
    nextEventCount: args.nextJournal.events.length,
    profilePositionCount: args.finalProfile.positions.length,
    consistencyStatus: args.consistency.status,
    consistencyIssueCount: args.consistency.issueCount,
    actualCashAfterWrite: Number.isFinite(args.finalProfile.availableCash) ? args.finalProfile.availableCash : null,
    expectedCashAfterWrite,
    cashAligned: resolveCashAlignment(
      Number.isFinite(args.finalProfile.availableCash) ? args.finalProfile.availableCash : null,
      expectedCashAfterWrite
    ),
    cashExpectationSource
  };
}
