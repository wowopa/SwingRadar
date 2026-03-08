"use client";

import { useMemo, useState } from "react";

import type { DailyScanSummaryDto } from "@/lib/api-contracts/swing-radar";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { RecommendationFramework } from "@/components/recommendations/recommendation-framework";
import { RecommendationsOverview } from "@/components/recommendations/recommendations-overview";
import { RecommendationTable } from "@/components/recommendations/recommendation-table";
import { Input } from "@/components/ui/input";
import { useFavoriteTickers } from "@/lib/use-favorite-tickers";
import type { Recommendation } from "@/types/recommendation";

type SortKey = "score_desc" | "score_asc" | "name";
type ToneFilter = "all" | Recommendation["signalTone"];
type SectorFilter = string;
type FavoriteFilter = "all" | "favorites";

export function RecommendationExplorer({
  items,
  dailyScan
}: {
  items: Recommendation[];
  dailyScan: DailyScanSummaryDto | null;
}) {
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<ToneFilter>("all");
  const [sector, setSector] = useState<SectorFilter>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const [sort, setSort] = useState<SortKey>("score_desc");
  const { favorites, isFavorite, toggleFavorite } = useFavoriteTickers();

  const sectors = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.sector))).sort((left, right) => left.localeCompare(right, "ko"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = items.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.ticker.toLowerCase().includes(normalized) ||
        item.company.toLowerCase().includes(normalized) ||
        item.sector.toLowerCase().includes(normalized);
      const matchesTone = tone === "all" || item.signalTone === tone;
      const matchesSector = sector === "all" || item.sector === sector;
      const matchesFavorite = favoriteFilter === "all" || favorites.includes(item.ticker);
      return matchesQuery && matchesTone && matchesSector && matchesFavorite;
    });

    next.sort((left, right) => {
      if (sort === "score_asc") {
        return left.score - right.score;
      }
      if (sort === "name") {
        return left.company.localeCompare(right.company, "ko");
      }

      const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return right.score - left.score;
    });

    return next;
  }, [favoriteFilter, favorites, items, query, sector, sort, tone]);

  return (
    <div>
      <section className="mb-8 grid gap-4 rounded-3xl border border-border/70 bg-card/50 p-5 lg:grid-cols-[1.4fr_180px_180px_180px_180px_auto] lg:items-end">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">종목명, 티커, 섹터로 바로 탐색할 수 있습니다.</p>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 삼성전자, 005930, 반도체" />
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">신호 톤</p>
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value as ToneFilter)}
            className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
          >
            <option value="all">전체</option>
            <option value="긍정">긍정</option>
            <option value="중립">중립</option>
            <option value="주의">주의</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">섹터</p>
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
          >
            <option value="all">전체</option>
            {sectors.map((sectorItem) => (
              <option key={sectorItem} value={sectorItem}>
                {sectorItem}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">즐겨찾기</p>
          <select
            value={favoriteFilter}
            onChange={(event) => setFavoriteFilter(event.target.value as FavoriteFilter)}
            className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
          >
            <option value="all">전체</option>
            <option value="favorites">즐겨찾기만</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">정렬</p>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
          >
            <option value="score_desc">점수 높은 순</option>
            <option value="score_asc">점수 낮은 순</option>
            <option value="name">종목명 순</option>
          </select>
        </div>
        <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
          결과 <span className="font-semibold text-white">{filteredItems.length}</span>건
        </div>
      </section>
      <section className="mb-6">
        <RecommendationsOverview items={filteredItems} dailyScan={dailyScan} />
      </section>
      {filteredItems.length ? (
        <>
          <section className="grid gap-6 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <RecommendationCard
                key={item.ticker}
                item={item}
                isFavorite={isFavorite(item.ticker)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </section>
          <section className="mt-6">
            <RecommendationTable items={filteredItems} favorites={favorites} onToggleFavorite={toggleFavorite} />
          </section>
        </>
      ) : (
        <section className="rounded-3xl border border-border/70 bg-card/40 p-8 text-center">
          <p className="text-lg font-semibold text-white">조건에 맞는 관찰 신호가 없습니다.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            검색어를 줄이거나 톤, 섹터, 즐겨찾기 필터를 완화하면 더 많은 종목을 볼 수 있습니다.
          </p>
        </section>
      )}
      <section className="mt-6">
        <RecommendationFramework />
      </section>
    </div>
  );
}
