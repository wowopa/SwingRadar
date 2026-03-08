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

type AnalysisNavigationProps = {
  currentTicker: string;
  previous?: ReadySymbol;
  next?: ReadySymbol;
  readyItems: ReadySymbol[];
};

const STORAGE_KEY = "swing-radar.recent-analysis";
const MAX_RECENT_ITEMS = 5;

export function AnalysisNavigation({
  currentTicker,
  previous,
  next,
  readyItems
}: AnalysisNavigationProps) {
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
    <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">분석 이동</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <NavigationLink
            href={previous ? `/analysis/${previous.ticker}` : undefined}
            title="이전 종목"
            label={previous ? `${previous.company} · ${previous.ticker}` : "이전 분석 종목이 없습니다."}
            note={previous?.sector ?? "현재 감시 종목 중 첫 번째 분석입니다."}
            icon={<ArrowLeft className="h-4 w-4" />}
            disabled={!previous}
          />
          <NavigationLink
            href={next ? `/analysis/${next.ticker}` : undefined}
            title="다음 종목"
            label={next ? `${next.company} · ${next.ticker}` : "다음 분석 종목이 없습니다."}
            note={next?.sector ?? "현재 감시 종목 중 마지막 분석입니다."}
            icon={<ArrowRight className="h-4 w-4" />}
            align="right"
            disabled={!next}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
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
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 transition hover:border-primary/30 hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.ticker} · {item.sector}
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
          : "border-border/70 bg-secondary/40 hover:border-primary/30 hover:bg-accent",
        align === "right" ? "text-right" : "text-left"
      ].join(" ")}
    >
      <div className={`mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${align === "right" ? "justify-end" : ""}`}>
        {align === "left" ? icon : null}
        <span>{title}</span>
        {align === "right" ? icon : null}
      </div>
      <p className={`text-sm font-medium ${disabled ? "text-muted-foreground" : "text-white"}`}>{label}</p>
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