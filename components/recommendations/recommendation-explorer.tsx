"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { RecommendationTable } from "@/components/recommendations/recommendation-table";
import { Input } from "@/components/ui/input";
import {
  resolveRecommendationActionBucket,
  type RecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import { useFavoriteTickers } from "@/lib/use-favorite-tickers";
import type { Recommendation, ValidationBasis } from "@/types/recommendation";

type SortKey = "score_desc" | "score_asc" | "name";
type ToneFilter = "all" | Recommendation["signalTone"];
type SectorFilter = string;
type FavoriteFilter = "all" | "favorites";
type TrustFilter = "all" | ValidationBasis;

const VALIDATION_BASIS_OPTIONS: ValidationBasis[] = [
  "실측 기반",
  "공용 추적 참고",
  "유사 업종 참고",
  "유사 흐름 참고",
  "보수 계산"
];

const ACTION_BUCKET_ORDER: RecommendationActionBucket[] = ["buy_now", "watch_only", "avoid"];

function resolveValidationBasis(item: Recommendation): ValidationBasis {
  if (item.validationBasis) {
    return item.validationBasis;
  }

  if (item.validation.sampleSize >= 25 && !item.validationSummary.includes("참고") && !item.validationSummary.includes("보수")) {
    return "실측 기반";
  }

  return "보수 계산";
}

function getActionBucket(item: Recommendation) {
  return (
    item.actionBucket ??
    resolveRecommendationActionBucket({
      signalTone: item.signalTone,
      score: item.score,
      activationScore: item.activationScore,
      featuredRank: item.featuredRank,
      trackingDiagnostic: item.trackingDiagnostic
    })
  );
}

function getToneClasses(tone: "emerald" | "sky" | "amber" | "stone") {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    stone: "border-stone-200 bg-stone-50 text-stone-700"
  };

  return tones[tone];
}

export function RecommendationExplorer({ items }: { items: Recommendation[] }) {
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<ToneFilter>("all");
  const [sector, setSector] = useState<SectorFilter>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const [trustFilter, setTrustFilter] = useState<TrustFilter>("all");
  const [sort, setSort] = useState<SortKey>("score_desc");
  const { favorites, toggleFavorite } = useFavoriteTickers();

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

      const leftBucket = ACTION_BUCKET_ORDER.indexOf(getActionBucket(left));
      const rightBucket = ACTION_BUCKET_ORDER.indexOf(getActionBucket(right));
      if (leftBucket !== rightBucket) {
        return leftBucket - rightBucket;
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

  const filteredTrustSummary = useMemo(() => {
    return filteredItems.reduce<Record<ValidationBasis, number>>(
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
  }, [filteredItems]);

  const bucketedItems = useMemo(() => {
    return filteredItems.reduce<Record<RecommendationActionBucket, Recommendation[]>>(
      (acc, item) => {
        acc[getActionBucket(item)].push(item);
        return acc;
      },
      {
        buy_now: [],
        watch_only: [],
        avoid: []
      }
    );
  }, [filteredItems]);

  const actionableCount = bucketedItems.buy_now.length + bucketedItems.watch_only.length;
  const enoughInvalidationCount = filteredItems.filter((item) => item.invalidationDistance <= -6).length;
  const verifiedCount = filteredItems.filter((item) => resolveValidationBasis(item) !== "보수 계산").length;
  const countsMatchAll = filteredItems.length === items.length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-3xl border border-border/70 bg-card/50 p-5 lg:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,0.75fr))] lg:items-end">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">종목명, 티커, 섹터로 바로 찾을 수 있습니다.</p>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 삼성전자, 005930, 반도체"
          />
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
        <FilterSelect label="검증 기준" value={trustFilter} onChange={setTrustFilter}>
          <option value="all">전체</option>
          {VALIDATION_BASIS_OPTIONS.map((basis) => (
            <option key={basis} value={basis}>
              {basis}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="정렬" value={sort} onChange={setSort}>
          <option value="score_desc">행동 우선순위</option>
          <option value="score_asc">점수 낮은 순</option>
          <option value="name">종목명순</option>
        </FilterSelect>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <div className="space-y-4 rounded-3xl border border-border/70 bg-card/40 p-5">
          <div className="border-b border-border/60 pb-4">
            <p className="text-sm font-semibold text-foreground">행동 중심으로 먼저 봅니다</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              이 화면은 종목을 많이 나열하는 대신, 장초 확인을 통과하면 행동할 수 있는 종목과 더 봐야 하는 종목을 먼저 나눠서 보여줍니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="행동 후보" value={`${actionableCount}개`} detail="장초 통과 후보 + 관찰만" tone="emerald" />
            <SummaryCard label="장초 통과 후보" value={`${bucketedItems.buy_now.length}개`} detail="장초 확인 통과 시 매수 검토할 후보" tone="sky" />
            <SummaryCard label="관찰만" value={`${bucketedItems.watch_only.length}개`} detail="확인 가격과 반응을 더 볼 후보" tone="amber" />
            <SummaryCard label="보류" value={`${bucketedItems.avoid.length}개`} detail="기본 카드에서는 뒤로 미룹니다" tone="stone" />
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/40 p-5">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">검증 근거 분포</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {countsMatchAll
                  ? "필터를 적용하지 않은 기본 상태라 현재 분포와 전체 분포가 같습니다."
                  : "현재 필터 결과와 전체 후보의 검증 근거를 한 번에 비교합니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/35 px-3 py-2 text-sm text-muted-foreground">
              {countsMatchAll ? `현재는 전체 동일 ${items.length}개` : `현재 ${filteredItems.length}개 / 전체 ${items.length}개`}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {VALIDATION_BASIS_OPTIONS.map((basis) => (
              <BasisRow
                key={basis}
                label={basis}
                filteredCount={filteredTrustSummary[basis]}
                totalCount={trustSummary[basis]}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryCard label="손절 여유" value={`${enoughInvalidationCount}개`} detail="손절 거리 -6% 이하" tone="amber" />
            <SummaryCard label="실측 외 검증" value={`${verifiedCount}개`} detail="보수 계산만으로 보지 않는 후보" tone="sky" />
          </div>
        </div>
      </section>

      {filteredItems.length ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">전체 후보 순위표</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                이 화면은 카드보다 비교표 중심으로 봅니다. 필터와 정렬로 후보를 좁힌 뒤, 필요한 종목만 상세 분석으로 들어가면 됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              장초 통과 후보 {bucketedItems.buy_now.length}개 · 관찰만 {bucketedItems.watch_only.length}개 · 보류 {bucketedItems.avoid.length}개
            </div>
          </div>
          <RecommendationTable items={filteredItems} favorites={favorites} onToggleFavorite={toggleFavorite} />
        </section>
      ) : (
        <section className="rounded-3xl border border-border/70 bg-card/40 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">조건에 맞는 후보가 없습니다.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            검색어 또는 섹터, 검증 기준 조건을 조금 더 넓히면 더 많은 종목을 볼 수 있습니다.
          </p>
        </section>
      )}

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

function SummaryCard({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "sky" | "amber" | "stone";
}) {
  return (
    <div className={`rounded-3xl border px-4 py-4 ${getToneClasses(tone)}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 opacity-80">{detail}</p>
    </div>
  );
}

function BasisRow({
  label,
  filteredCount,
  totalCount
}: {
  label: string;
  filteredCount: number;
  totalCount: number;
}) {
  const isSame = filteredCount === totalCount;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{isSame ? "현재와 전체 기준이 동일합니다." : "현재 필터와 전체 기준 비교"}</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {isSame ? (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary">
            동일 {totalCount}
          </span>
        ) : (
          <>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary">
              현재 {filteredCount}
            </span>
            <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-muted-foreground">
              전체 {totalCount}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

