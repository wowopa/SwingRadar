"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { DailyScanSummaryDto } from "@/lib/api-contracts/swing-radar";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { RecommendationFramework } from "@/components/recommendations/recommendation-framework";
import { RecommendationsOverview } from "@/components/recommendations/recommendations-overview";
import { RecommendationTable } from "@/components/recommendations/recommendation-table";
import { Input } from "@/components/ui/input";
import { useFavoriteTickers } from "@/lib/use-favorite-tickers";
import type { Recommendation, ValidationBasis } from "@/types/recommendation";

type SortKey = "score_desc" | "score_asc" | "name";
type ToneFilter = "all" | Recommendation["signalTone"];
type SectorFilter = string;
type FavoriteFilter = "all" | "favorites";
type TrustFilter = "all" | ValidationBasis;

function resolveValidationBasis(item: Recommendation): ValidationBasis {
  if (item.validationBasis) {
    return item.validationBasis;
  }

  if (item.validation.sampleSize >= 25 && !item.validationSummary.includes("참고") && !item.validationSummary.includes("보수")) {
    return "실측 기반";
  }

  return "보수 계산";
}

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
  const [trustFilter, setTrustFilter] = useState<TrustFilter>("all");
  const [sort, setSort] = useState<SortKey>("score_desc");
  const { favorites, isFavorite, toggleFavorite } = useFavoriteTickers();

  const sectors = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.sector))).sort((left, right) => left.localeCompare(right, "ko"));
  }, [items]);

  const trustSummary = useMemo(() => {
    return items.reduce<Record<ValidationBasis, number>>(
      (acc, item) => {
        acc[resolveValidationBasis(item)] += 1;
        return acc;
      },
      {
        "실측 기반": 0,
        "공용 추적 참고": 0,
        "유사 업종 참고": 0,
        "유사 흐름 참고": 0,
        "보수 계산": 0
      }
    );
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
      const matchesTrust = trustFilter === "all" || resolveValidationBasis(item) === trustFilter;
      return matchesQuery && matchesTone && matchesSector && matchesFavorite && matchesTrust;
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
  }, [favoriteFilter, favorites, items, query, sector, sort, tone, trustFilter]);

  return (
    <div>
      <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TrustCard label="실측 기반" value={trustSummary["실측 기반"]} tone="emerald" />
        <TrustCard label="공용 추적 참고" value={trustSummary["공용 추적 참고"]} tone="teal" />
        <TrustCard label="유사 업종 참고" value={trustSummary["유사 업종 참고"]} tone="sky" />
        <TrustCard label="유사 흐름 참고" value={trustSummary["유사 흐름 참고"]} tone="amber" />
        <TrustCard label="보수 계산" value={trustSummary["보수 계산"]} tone="rose" />
      </section>
      <section className="mb-8 grid gap-4 rounded-3xl border border-border/70 bg-card/50 p-5 lg:grid-cols-[1.4fr_160px_160px_160px_170px_180px_auto] lg:items-end">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">종목명, 티커, 섹터로 바로 찾을 수 있습니다.</p>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 삼성전자, 005930, 반도체" />
        </div>
        <FilterSelect label="신호 톤" value={tone} onChange={setTone}>
          <option value="all">전체</option>
          <option value="긍정">긍정</option>
          <option value="중립">중립</option>
          <option value="주의">주의</option>
        </FilterSelect>
        <FilterSelect label="섹터" value={sector} onChange={setSector}>
          <option value="all">전체</option>
          {sectors.map((sectorItem) => (
            <option key={sectorItem} value={sectorItem}>
              {sectorItem}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="즐겨찾기" value={favoriteFilter} onChange={setFavoriteFilter}>
          <option value="all">전체</option>
          <option value="favorites">즐겨찾기만</option>
        </FilterSelect>
        <FilterSelect label="검증 근거" value={trustFilter} onChange={setTrustFilter}>
          <option value="all">전체</option>
          <option value="실측 기반">실측 기반</option>
          <option value="공용 추적 참고">공용 추적 참고</option>
          <option value="유사 업종 참고">유사 업종 참고</option>
          <option value="유사 흐름 참고">유사 흐름 참고</option>
          <option value="보수 계산">보수 계산</option>
        </FilterSelect>
        <FilterSelect label="정렬" value={sort} onChange={setSort}>
          <option value="score_desc">점수 높은 순</option>
          <option value="score_asc">점수 낮은 순</option>
          <option value="name">종목명 순</option>
        </FilterSelect>
        <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
          결과 <span className="font-semibold text-foreground">{filteredItems.length}</span>건
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
          <p className="text-lg font-semibold text-foreground">조건에 맞는 관찰 신호가 없습니다.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            검색어를 줄이거나 톤, 섹터, 검증 근거 조건을 조금 더 넓혀보면 더 많은 종목을 볼 수 있습니다.
          </p>
        </section>
      )}
      <section className="mt-6">
        <RecommendationFramework />
      </section>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="flex h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50"
      >
        {children}
      </select>
    </div>
  );
}

function TrustCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "emerald" | "teal" | "sky" | "amber" | "rose";
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700"
  };

  return (
    <div className={`rounded-3xl border px-5 py-4 ${tones[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
