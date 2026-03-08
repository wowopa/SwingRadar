import Link from "next/link";

import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPercent } from "@/lib/utils";
import type { Recommendation } from "@/types/recommendation";

export function RecommendationTable({
  items,
  favorites,
  onToggleFavorite
}: {
  items: Recommendation[];
  favorites: string[];
  onToggleFavorite: (ticker: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검증 통계 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-3 pr-6">후보</th>
                <th className="pb-3 pr-6">즐겨찾기</th>
                <th className="pb-3 pr-6">종목</th>
                <th className="pb-3 pr-6">톤</th>
                <th className="pb-3 pr-6">점수</th>
                <th className="pb-3 pr-6">신호 메모</th>
                <th className="pb-3 pr-6">표본 수</th>
                <th className="pb-3 pr-6">적중률</th>
                <th className="pb-3 pr-6">평균 수익</th>
                <th className="pb-3 pr-6">무효화 거리</th>
                <th className="pb-3 pr-6">상세</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                return (
                  <tr key={item.ticker} className="border-b border-border/60 text-slate-200 last:border-0">
                    <td className="py-4 pr-6">
                      {item.featuredRank ? (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                          #{item.featuredRank}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 pr-6">
                      <FavoriteTickerButton active={favorites.includes(item.ticker)} label={`${item.company} 즐겨찾기`} onClick={() => onToggleFavorite(item.ticker)} />
                    </td>
                    <td className="py-4 pr-6">
                      <div className="font-medium text-white">{item.company}</div>
                      <div className="text-xs text-muted-foreground">{item.ticker}</div>
                    </td>
                    <td className="py-4 pr-6"><SignalToneBadge tone={item.signalTone} /></td>
                    <td className="py-4 pr-6">{item.score}</td>
                    <td className="py-4 pr-6">
                      <div className="text-white">{item.signalLabel}</div>
                      <div className="text-xs text-muted-foreground">{item.observationWindow}</div>
                    </td>
                    <td className="py-4 pr-6">{item.validation.sampleSize}</td>
                    <td className="py-4 pr-6">{item.validation.hitRate}%</td>
                    <td className="py-4 pr-6">{formatPercent(item.validation.avgReturn)}</td>
                    <td className="py-4 pr-6">{formatPercent(item.invalidationDistance)}</td>
                    <td className="py-4">
                      <Link className="text-primary hover:text-primary/80" href={`/analysis/${item.ticker}`}>
                        분석 보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
