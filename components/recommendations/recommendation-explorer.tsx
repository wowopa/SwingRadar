"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { RecommendationFramework } from "@/components/recommendations/recommendation-framework";
import { RecommendationTable } from "@/components/recommendations/recommendation-table";
import { Input } from "@/components/ui/input";
import { formatPercent } from "@/lib/utils";
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

function resolveValidationBasis(item: Recommendation): ValidationBasis {
  if (item.validationBasis) {
    return item.validationBasis;
  }

  if (item.validation.sampleSize >= 25 && !item.validationSummary.includes("참고") && !item.validationSummary.includes("보수")) {
    return "실측 기반";
  }

  return "보수 계산";
}

function getCandidateLabel(item: Recommendation) {
  if ((item.featuredRank ?? Number.MAX_SAFE_INTEGER) <= 5 || item.signalTone === "긍정") {
    return "오늘 바로 볼 후보";
  }
  if ((item.featuredRank ?? Number.MAX_SAFE_INTEGER) <= 12 || item.validation.hitRate >= 55) {
    return "관심 있게 볼 후보";
  }
  return "조건 확인이 더 필요한 후보";
}

function buildReasons(item: Recommendation) {
  const reasons = [];

  if ((item.featuredRank ?? Number.MAX_SAFE_INTEGER) <= 10) {
    reasons.push(`오늘 후보 상위권 #${item.featuredRank}`);
  }
  if (item.validation.hitRate >= 58) {
    reasons.push(`유사 사례 적중률 ${item.validation.hitRate}%`);
  }
  if (item.validation.avgReturn >= 4) {
    reasons.push(`평균 수익 ${formatPercent(item.validation.avgReturn)}`);
  }
  if (item.invalidationDistance <= -8) {
    reasons.push(`무효화 여유 ${formatPercent(item.invalidationDistance)}`);
  }
  if (item.validation.sampleSize >= 12) {
    reasons.push(`검증 표본 ${item.validation.sampleSize}건`);
  }

  return reasons.slice(0, 3);
}

function getToneClasses(tone: "emerald" | "sky" | "teal" | "amber") {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700"
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

  const shortlist = useMemo(() => filteredItems.slice(0, 12), [filteredItems]);
  const additionalCount = Math.max(filteredItems.length - shortlist.length, 0);
  const shortlistCount = shortlist.length;
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
        <FilterSelect label="검증 근거" value={trustFilter} onChange={setTrustFilter}>
          <option value="all">전체</option>
          {VALIDATION_BASIS_OPTIONS.map((basis) => (
            <option key={basis} value={basis}>
              {basis}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="정렬" value={sort} onChange={setSort}>
          <option value="score_desc">점수 높은 순</option>
          <option value="score_asc">점수 낮은 순</option>
          <option value="name">종목명 순</option>
        </FilterSelect>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <div className="space-y-4 rounded-3xl border border-border/70 bg-card/40 p-5">
          <div className="border-b border-border/60 pb-4">
            <p className="text-sm font-semibold text-foreground">오늘은 이 후보부터 보면 됩니다</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              이 화면은 가능한 많은 종목을 나열하기보다, 지금 볼 만한 후보를 먼저 추리고 그 이유와 리스크를 빠르게 읽는 데
              맞춰져 있습니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="현재 후보" value={`${filteredItems.length}개`} detail="필터 기준으로 남은 후보" tone="emerald" />
            <SummaryCard label="우선 볼 종목" value={`${shortlistCount}개`} detail="아래 카드에서 먼저 확인할 후보 기준" tone="sky" />
            <SummaryCard label="검증 근거 확보" value={`${verifiedCount}개`} detail="보수 계산만으로 보지 않은 후보" tone="teal" />
            <SummaryCard
              label="무효화 여유"
              value={`${enoughInvalidationCount}개`}
              detail="무효화 거리 -6% 이하"
              tone="amber"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/40 p-5">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">검증 근거 분포</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {countsMatchAll
                  ? "필터가 적용되지 않은 기본 상태라 현재 분포와 전체 분포가 같습니다."
                  : "현재 필터 결과와 전체 후보의 검증 근거를 한 번에 비교합니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/35 px-3 py-2 text-sm text-muted-foreground">
              {countsMatchAll ? `현재와 전체 동일 ${items.length}개` : `현재 ${filteredItems.length}개 / 전체 ${items.length}개`}
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
        </div>
      </section>

      {shortlist.length ? (
        <>
          <section className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">우선 볼 후보</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                카드에서는 종목별 핵심 판단만 먼저 보고, 더 넓은 비교는 아래 표에서 이어서 보면 됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              {additionalCount > 0 ? `나머지 ${additionalCount}개 후보는 아래 비교표에서 확인` : "현재 필터 기준 모든 후보를 카드로 보여주고 있습니다."}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            {shortlist.map((item) => {
              const reasons = buildReasons(item);

              return (
                <RecommendationCard
                  key={item.ticker}
                  item={item}
                  summaryLabel={getCandidateLabel(item)}
                  summaryReasons={reasons}
                  isFavorite={isFavorite(item.ticker)}
                  onToggleFavorite={toggleFavorite}
                />
              );
            })}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">전체 후보 비교표</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                카드에서 먼저 본 후보를 다른 종목과 비교하거나, 필터 결과 전체를 한 줄씩 빠르게 훑을 때 쓰는 표입니다.
              </p>
            </div>
            <RecommendationTable items={filteredItems} favorites={favorites} onToggleFavorite={toggleFavorite} />
          </section>
        </>
      ) : (
        <section className="rounded-3xl border border-border/70 bg-card/40 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">조건에 맞는 후보가 없습니다.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            검색어나 톤, 섹터, 검증 근거 조건을 조금 더 넓히면 더 많은 종목을 볼 수 있습니다.
          </p>
        </section>
      )}

      <section>
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

function SummaryCard({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "sky" | "teal" | "amber";
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
        <p className="text-xs text-muted-foreground">{isSame ? "현재와 전체 기준이 동일합니다." : "현재 필터와 전체 기준 분포"}</p>
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
