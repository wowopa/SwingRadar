"use client";

import { useEffect, useMemo, useState } from "react";

import { buildOpeningRecheckCounts, OPENING_RECHECK_STATUSES } from "@/lib/recommendations/opening-recheck";
import type { OpeningRecheckDecision, OpeningRecheckStatus } from "@/types/recommendation";

const STORAGE_KEY = "swing-radar.opening-recheck";

type OpeningRecheckStorage = Record<string, Record<string, OpeningRecheckDecision>>;

function readOpeningRecheckStorage(): OpeningRecheckStorage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as OpeningRecheckStorage;
  } catch {
    return {};
  }
}

function sanitizeScanDecisions(
  decisions: Record<string, OpeningRecheckDecision> | undefined,
  allowedTickers: string[]
): Record<string, OpeningRecheckDecision> {
  if (!decisions) {
    return {};
  }

  const allowed = new Set(allowedTickers);
  const next: Record<string, OpeningRecheckDecision> = {};

  for (const [ticker, decision] of Object.entries(decisions)) {
    if (!allowed.has(ticker) || !decision || typeof decision !== "object") {
      continue;
    }

    if (!OPENING_RECHECK_STATUSES.includes(decision.status)) {
      continue;
    }

    if (typeof decision.updatedAt !== "string" || !decision.updatedAt.trim()) {
      continue;
    }

    next[ticker] = decision;
  }

  return next;
}

function persistScanDecisions(scanKey: string, decisions: Record<string, OpeningRecheckDecision>) {
  try {
    const storage = readOpeningRecheckStorage();
    if (Object.keys(decisions).length) {
      storage[scanKey] = decisions;
    } else {
      delete storage[scanKey];
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // Ignore storage write failures and keep the in-memory state.
  }
}

export function useOpeningRecheck({ scanKey, tickers }: { scanKey: string; tickers: string[] }) {
  const [decisions, setDecisions] = useState<Record<string, OpeningRecheckDecision>>({});
  const tickersKey = useMemo(() => tickers.join("|"), [tickers]);

  useEffect(() => {
    const storage = readOpeningRecheckStorage();
    setDecisions(sanitizeScanDecisions(storage[scanKey], tickers));
  }, [scanKey, tickers, tickersKey]);

  const counts = useMemo(() => buildOpeningRecheckCounts(tickers, decisions), [decisions, tickers, tickersKey]);

  const setStatus = (ticker: string, status: OpeningRecheckStatus) => {
    setDecisions((current) => {
      const next = { ...current };
      if (status === "pending") {
        delete next[ticker];
      } else {
        next[ticker] = {
          status,
          updatedAt: new Date().toISOString()
        };
      }

      persistScanDecisions(scanKey, next);
      return next;
    });
  };

  const clearAll = () => {
    setDecisions({});
    persistScanDecisions(scanKey, {});
  };

  return {
    decisions,
    counts,
    getStatus: (ticker: string) => decisions[ticker]?.status ?? "pending",
    getDecision: (ticker: string) => decisions[ticker],
    setStatus,
    clearAll
  };
}
