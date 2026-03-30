"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReadySymbol = {
  ticker: string;
  company: string;
  sector: string;
};

type CompanyOverview = {
  company: string;
  ticker: string;
  market: string;
  region: string;
  status: "ready" | "pending";
  summaryLines: string[];
};

type AnalysisNavigationProps = {
  currentTicker: string;
  readyItems: ReadySymbol[];
  overview: CompanyOverview;
};

const STORAGE_KEY = "swing-radar.recent-analysis";
const MAX_RECENT_ITEMS = 5;
type RecentAnalysisItem = ReadySymbol;

export function AnalysisNavigation({ currentTicker, readyItems, overview }: AnalysisNavigationProps) {
  const [recentItems, setRecentItems] = useState<RecentAnalysisItem[]>([]);

  useEffect(() => {
    const parsed = readRecentItems(readyItems);
    const currentItem =
      readyItems.find((item) => item.ticker === currentTicker) ?? {
        ticker: currentTicker,
        company: overview.company,
        sector: overview.market
      };
    const nextItems = [currentItem, ...parsed.filter((item) => item.ticker !== currentTicker)].slice(0, MAX_RECENT_ITEMS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    setRecentItems(nextItems);
  }, [currentTicker, overview.company, overview.market, readyItems]);

  const visibleRecentItems = useMemo(() => {
    return recentItems.filter((item) => item.ticker !== currentTicker);
  }, [currentTicker, recentItems]);

  const statusLabel = overview.status === "ready" ? "분석 가능" : "준비 중";

  return (
    <section className="relative z-20 mb-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="relative z-20">
        <CardHeader>
          <CardTitle className="text-base text-foreground">기업 개요</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>{overview.market}</span>
              <span>/</span>
              <span>{overview.region}</span>
              <span>/</span>
              <span>{statusLabel}</span>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {overview.company} ({overview.ticker})
            </p>
            <div className="mt-3 space-y-2">
              {overview.summaryLines.map((line) => (
                <p key={line} className="text-sm leading-7 text-foreground/80">
                  - {line}
                </p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-foreground/80">
                상장 시장 {overview.market}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-foreground/80">
                지역 {overview.region}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-foreground/80">
                분석 상태 {statusLabel}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <History className="h-4 w-4" />
            최근 본 종목
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleRecentItems.length ? (
            visibleRecentItems.map((item) => (
              <Link
                key={item.ticker}
                href={`/analysis/${item.ticker}`}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 transition hover:border-primary/30 hover:bg-accent/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.ticker} / {item.sector}
                  </p>
                </div>
                <span className="text-xs text-primary">다시 보기</span>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-5 text-sm text-muted-foreground">
              최근에 둘러본 다른 분석 종목이 아직 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function readRecentItems(readyItems: ReadySymbol[]) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeRecentItem(item, readyItems))
      .filter((item): item is RecentAnalysisItem => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeRecentItem(value: unknown, readyItems: ReadySymbol[]): RecentAnalysisItem | null {
  if (typeof value === "string") {
    return readyItems.find((item) => item.ticker === value) ?? null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RecentAnalysisItem>;
  if (
    typeof candidate.ticker !== "string" ||
    typeof candidate.company !== "string" ||
    typeof candidate.sector !== "string"
  ) {
    return null;
  }

  return {
    ticker: candidate.ticker,
    company: candidate.company,
    sector: candidate.sector
  };
}
