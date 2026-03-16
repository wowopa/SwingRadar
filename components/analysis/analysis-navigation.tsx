"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReadySymbol = {
  ticker: string;
  company: string;
  sector: string;
};

type CompanyOverview = {
  company: string;
  ticker: string;
  sector: string;
  market: string;
  region: string;
  status: "ready" | "pending";
  summary: string;
};

type AnalysisNavigationProps = {
  currentTicker: string;
  previous?: ReadySymbol;
  next?: ReadySymbol;
  readyItems: ReadySymbol[];
  overview: CompanyOverview;
};

const STORAGE_KEY = "swing-radar.recent-analysis";
const MAX_RECENT_ITEMS = 5;

export function AnalysisNavigation({ currentTicker, previous, next, readyItems, overview }: AnalysisNavigationProps) {
  const [recentTickers, setRecentTickers] = useState<string[]>([]);

  useEffect(() => {
    const parsed = readRecentTickers();
    const nextTickers = [currentTicker, ...parsed.filter((item) => item !== currentTicker)].slice(0, MAX_RECENT_ITEMS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickers));
    setRecentTickers(nextTickers);
  }, [currentTicker]);

  const recentItems = useMemo(() => {
    return recentTickers
      .filter((ticker) => ticker !== currentTicker)
      .map((ticker) => readyItems.find((item) => item.ticker === ticker))
      .filter((item): item is ReadySymbol => Boolean(item));
  }, [currentTicker, readyItems, recentTickers]);

  return (
    <section className="relative z-20 mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="relative z-20">
        <CardHeader>
          <CardTitle className="text-base text-foreground">기업 개요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>{overview.market}</span>
              <span>쨌</span>
              <span>{overview.region}</span>
              <span>쨌</span>
              <span>{overview.sector}</span>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {overview.company} ({overview.ticker})
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground/80">{overview.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-foreground/80">
                상장 시장 {overview.market}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-foreground/80">
                업종 {overview.sector}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-foreground/80">
                분석 상태 {overview.status === "ready" ? "분석 가능" : "준비 중"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <NavigationLink
              href={previous ? `/analysis/${previous.ticker}` : undefined}
              title="이전 종목"
              label={previous ? `${previous.company} 쨌 ${previous.ticker}` : "이전 분석 종목이 없습니다."}
              note={previous?.sector ?? "현재 감시 종목 중 첫 번째 분석입니다."}
              icon={<ArrowLeft className="h-4 w-4" />}
              disabled={!previous}
            />
            <NavigationLink
              href={next ? `/analysis/${next.ticker}` : undefined}
              title="다음 종목"
              label={next ? `${next.company} 쨌 ${next.ticker}` : "다음 분석 종목이 없습니다."}
              note={next?.sector ?? "현재 감시 종목 중 마지막 분석입니다."}
              icon={<ArrowRight className="h-4 w-4" />}
              align="right"
              disabled={!next}
            />
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">분석 내 이동 안내</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              전체 종목 검색은 페이지 상단 공용 검색 바에서 바로 찾을 수 있고, 이 영역에서는 현재 분석 흐름을 끊지 않도록
              이전/다음 종목 이동만 남겨두었습니다.
            </p>
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
          {recentItems.length ? (
            recentItems.map((item) => (
              <Link
                key={item.ticker}
                href={`/analysis/${item.ticker}`}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 transition hover:border-primary/30 hover:bg-accent/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.ticker} 쨌 {item.sector}
                  </p>
                </div>
                <span className="text-xs text-primary">다시 보기</span>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-5 text-sm text-muted-foreground">
              최근에 열어본 다른 분석 종목이 아직 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function NavigationLink({
  href,
  title,
  label,
  note,
  icon,
  align = "left",
  disabled = false
}: {
  href?: string;
  title: string;
  label: string;
  note: string;
  icon: ReactNode;
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const content = (
    <div
      className={[
        "rounded-2xl border px-4 py-4 transition",
        disabled
          ? "border-dashed border-border/70 bg-secondary/20 text-muted-foreground"
          : "border-border/70 bg-secondary/40 hover:border-primary/30 hover:bg-accent/50",
        align === "right" ? "text-right" : "text-left"
      ].join(" ")}
    >
      <div className={`mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${align === "right" ? "justify-end" : ""}`}>
        {align === "left" ? icon : null}
        <span>{title}</span>
        {align === "right" ? icon : null}
      </div>
      <p className={`text-sm font-medium ${disabled ? "text-muted-foreground" : "text-foreground"}`}>{label}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );

  if (disabled || !href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function readRecentTickers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
