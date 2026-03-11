"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import { ChartSnapshot } from "@/components/tracking/chart-snapshot";
import { HistoryTable } from "@/components/tracking/history-table";
import { NewsHistoryCards } from "@/components/tracking/news-history-cards";
import { ScoreLogPanel } from "@/components/tracking/score-log-panel";
import { TrackingOverview } from "@/components/tracking/tracking-overview";
import { TrackingReviewPanel } from "@/components/tracking/tracking-review-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSymbolByTicker } from "@/lib/symbols/master";
import { useFavoriteTickers } from "@/lib/use-favorite-tickers";
import { formatPercent } from "@/lib/utils";
import type { SignalHistoryEntry, TrackingDetail } from "@/types/tracking";

interface TrackingDetailPanelProps {
  history: SignalHistoryEntry[];
  details: Record<string, TrackingDetail>;
}

type ResultFilter = "all" | SignalHistoryEntry["result"];
type FavoriteFilter = "all" | "favorites";

function formatStatusLabel(entry: SignalHistoryEntry) {
  if (!entry.closedReason || ["감시중", "진행중"].includes(entry.result)) {
    return entry.result;
  }

  return `${entry.result} · ${entry.closedReason}`;
}

export function TrackingDetailPanel({ history, details }: TrackingDetailPanelProps) {
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const { favorites, toggleFavorite } = useFavoriteTickers();

  const sectors = useMemo(() => {
    return Array.from(
      new Set(
        history
          .map((item) => getSymbolByTicker(item.ticker)?.sector)
          .filter((sector): sector is string => Boolean(sector))
      )
    ).sort((left, right) => left.localeCompare(right, "ko"));
  }, [history]);

  const filteredHistory = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return history.filter((item) => {
      const symbol = getSymbolByTicker(item.ticker);
      const company = symbol?.company ?? item.company;
      const sector = symbol?.sector ?? "기타";
      const matchesQuery =
        !normalized ||
        company.toLowerCase().includes(normalized) ||
        item.ticker.toLowerCase().includes(normalized) ||
        sector.toLowerCase().includes(normalized);
      const matchesResult = resultFilter === "all" || item.result === resultFilter;
      const matchesSector = sectorFilter === "all" || sector === sectorFilter;
      const matchesFavorite = favoriteFilter === "all" || favorites.includes(item.ticker);
      return matchesQuery && matchesResult && matchesSector && matchesFavorite;
    });
  }, [favoriteFilter, favorites, history, query, resultFilter, sectorFilter]);

  useEffect(() => {
    if (activeId && !filteredHistory.some((item) => item.id === activeId)) {
      setActiveId("");
    }
  }, [activeId, filteredHistory]);

  const activeEntry = filteredHistory.find((item) => item.id === activeId);
  const activeDetail = activeEntry ? details[activeEntry.id] : undefined;
  const activeSymbol = activeEntry ? getSymbolByTicker(activeEntry.ticker) : undefined;
  const activeCompany = activeSymbol?.company ?? activeEntry?.company;
  const activeSector = activeSymbol?.sector ?? "기타";

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <TrackingOverview items={history} />

        <Card>
          <CardHeader className="flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>공용 추적 기록 찾기</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">종목, 상태, 업종, 즐겨찾기 기준으로 공용 추적 기록을 빠르게 고를 수 있습니다.</p>
            </div>
            <div className="grid w-full gap-3 lg:max-w-5xl lg:grid-cols-[1fr_180px_180px_180px]">
              <Input placeholder="종목명, 티커, 업종 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
              <select
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value as ResultFilter)}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
              >
                <option value="all">전체 상태</option>
                <option value="감시중">감시중</option>
                <option value="진행중">진행중</option>
                <option value="성공">성공</option>
                <option value="실패">실패</option>
                <option value="무효화">무효화</option>
              </select>
              <select
                value={sectorFilter}
                onChange={(event) => setSectorFilter(event.target.value)}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
              >
                <option value="all">전체 업종</option>
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <select
                value={favoriteFilter}
                onChange={(event) => setFavoriteFilter(event.target.value as FavoriteFilter)}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
              >
                <option value="all">전체</option>
                <option value="favorites">즐겨찾기만</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              필터 결과 <span className="font-semibold text-foreground">{filteredHistory.length}</span>건
            </div>
            {filteredHistory.length ? (
              <HistoryTable
                items={filteredHistory}
                activeId={activeId}
                favoriteTickers={favorites}
                onSelect={setActiveId}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-6 text-sm leading-6 text-muted-foreground">
                조건에 맞는 공용 추적 기록이 아직 없습니다. 검색어나 상태, 업종 필터를 조금 넓혀 보세요.
              </div>
            )}
          </CardContent>
        </Card>

        {activeEntry && activeDetail ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>
                    {activeCompany} {activeEntry.ticker} 공용 추적 상세
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground" type="button">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>시작 상태, 가격 흐름, 이벤트, 점수 변화를 한 번에 확인합니다.</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeSector} · 시작일 {activeEntry.signalDate} · {favorites.includes(activeEntry.ticker) ? "즐겨찾기 등록 종목" : "공용 추적 종목"}
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <SummaryMetric label="현재 상태" value={formatStatusLabel(activeEntry)} />
                <SummaryMetric label="최대 상승" value={formatPercent(activeEntry.mfe)} emphasis="text-positive" />
                <SummaryMetric label="최대 하락" value={formatPercent(activeEntry.mae)} emphasis="text-caution" />
                <SummaryMetric label="보유일" value={`${activeEntry.holdingDays}일`} />
              </CardContent>
              <CardContent className="grid gap-4 pt-0 md:grid-cols-3">
                {activeDetail.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{metric.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Tabs defaultValue="review" className="w-full">
              <TabsList>
                <TabsTrigger value="review">메모</TabsTrigger>
                <TabsTrigger value="chart">가격 흐름</TabsTrigger>
                <TabsTrigger value="news">이벤트</TabsTrigger>
                <TabsTrigger value="log">점수 로그</TabsTrigger>
              </TabsList>
              <TabsContent value="review">
                <TrackingReviewPanel detail={activeDetail} />
              </TabsContent>
              <TabsContent value="chart">
                <ChartSnapshot points={activeDetail.chartSnapshot} />
              </TabsContent>
              <TabsContent value="news">
                <NewsHistoryCards items={activeDetail.historicalNews} />
              </TabsContent>
              <TabsContent value="log">
                <ScoreLogPanel items={activeDetail.scoreLog} />
              </TabsContent>
            </Tabs>
          </div>
        ) : filteredHistory.length ? (
          <Card>
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              공용 워크스페이스에서는 목록을 먼저 훑고, 필요한 기록만 선택해 상세를 열어볼 수 있습니다.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function SummaryMetric({
  label,
  value,
  emphasis
}: {
  label: string;
  value: string;
  emphasis?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 text-lg font-semibold text-foreground ${emphasis ?? ""}`}>{value}</p>
    </div>
  );
}
