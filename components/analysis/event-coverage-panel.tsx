"use client";

import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { NewsImpactItem } from "@/types/analysis";

function summarize(items: NewsImpactItem[]) {
  let disclosure = 0;
  let curated = 0;
  let externalNews = 0;

  for (const item of items) {
    if (item.eventType === "curated-news") {
      curated += 1;
      continue;
    }

    if (
      item.source === "dart" ||
      [
        "earnings",
        "treasury-stock",
        "contract",
        "clinical-approval",
        "capital-raise",
        "risk",
        "inquiry",
        "governance",
        "general-disclosure"
      ].includes(item.eventType)
    ) {
      disclosure += 1;
      continue;
    }

    externalNews += 1;
  }

  const confidence =
    disclosure + curated >= 2
      ? "보강됨"
      : disclosure + curated >= 1 || items.length >= 2
        ? "제한적"
        : "취약";

  const note =
    items.length === 0
      ? "기사 수집이 비어 있어 이벤트 점수 해석을 보수적으로 봐야 합니다."
      : externalNews === 0 && disclosure + curated > 0
        ? "절대 기사 수는 적지만 공시와 큐레이션으로 커버리지를 보강한 상태입니다."
        : disclosure + curated > 0
          ? "외부 기사와 공시, 큐레이션을 함께 해석하는 구간입니다."
          : "외부 기사 중심이라 가격과 무효화 기준을 더 보수적으로 읽어야 합니다.";

  return { disclosure, curated, externalNews, confidence, note };
}

function sortRecent(items: NewsImpactItem[]) {
  return sortAll(items)
    .slice(0, 5);
}

function sortAll(items: NewsImpactItem[]) {
  return [...items]
    .sort((left, right) => {
      const leftTime = Date.parse(left.date);
      const rightTime = Date.parse(right.date);

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return right.date.localeCompare(left.date);
      }

      return rightTime - leftTime;
    });
}

export function EventCoveragePanel({ items }: { items: NewsImpactItem[] }) {
  const coverage = summarize(items);
  const recentItems = sortRecent(items);

  return (
    <Card>
      <CardHeader>
        <CardTitle>이벤트 커버리지</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">커버리지 판단</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{coverage.confidence}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{coverage.note}</p>
          </div>
          <MetricCard label="공시" value={`${coverage.disclosure}건`} />
          <MetricCard label="큐레이션" value={`${coverage.curated}건`} />
          <MetricCard label="외부 기사" value={`${coverage.externalNews}건`} />
        </div>

        <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">최근 반영 이벤트</p>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">최신순 5건</p>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-sm font-medium text-primary transition hover:text-primary/80" type="button">
                    더보기 &gt;
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>외부 이벤트 전체 목록</DialogTitle>
                    <DialogDescription>최신 날짜순으로 반영된 이벤트 전체를 확인합니다.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                    {items.length ? (
                      sortAll(items).map((item) => (
                          <a
                            key={`dialog-${item.date}-${item.headline}`}
                            href={item.url || undefined}
                            target={item.url ? "_blank" : undefined}
                            rel={item.url ? "noreferrer" : undefined}
                            className="block rounded-2xl border border-border/60 bg-background/60 px-4 py-3 transition hover:border-primary/30 hover:bg-background"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.date}</span>
                              <span className="rounded-full border border-border/70 px-2 py-0.5">{item.source}</span>
                            </div>
                            <p className="mt-2 text-sm font-medium leading-6 text-foreground">{item.headline}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                          </a>
                        ))
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground">아직 반영된 외부 이벤트가 없습니다.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {recentItems.length ? (
            <div className="mt-3 space-y-3">
              {recentItems.map((item) => (
                <a
                  key={`${item.date}-${item.headline}`}
                  href={item.url || undefined}
                  target={item.url ? "_blank" : undefined}
                  rel={item.url ? "noreferrer" : undefined}
                  className="block rounded-2xl border border-border/60 bg-background/60 px-4 py-3 transition hover:border-primary/30 hover:bg-background"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.date}</span>
                    <span className="rounded-full border border-border/70 px-2 py-0.5">{item.source}</span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-6 text-foreground">{item.headline}</p>
                    {item.url ? <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">아직 반영된 외부 이벤트가 없습니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
