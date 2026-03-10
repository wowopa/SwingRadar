"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { DailyScanSummaryDto } from "@/lib/api-contracts/swing-radar";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { RecommendationFramework } from "@/components/recommendations/recommendation-framework";
import { RecommendationsOverview } from "@/components/recommendations/recommendations-overview";
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

  if (
    item.validation.sampleSize >= 25 &&
    !item.validationSummary.includes("참고") &&
    !item.validationSummary.includes("보수")
  ) {
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
    reasons.push(`유사 패턴 적중률 ${item.validation.hitRate}%`);
  }
  if (item.validation.avgReturn >= 4) {
    reasons.push(`평균 수익 ${formatPercent(item.validation.avgReturn)}`);
  }
  if (item.invalidationDistance <= -8) {
    reasons.push(`무효화 여유 ${formatPercent(item.invalidationDistance)}`);
  }
  if (item.eventCoverage && item.eventCoverage !== "취약") {
    reasons.push(`이벤트 근거 ${item.eventCoverage}`);
  }

  return reasons.slice(0, 3);
}

function getWatchout(item: Recommendation) {
  if (item.signalTone === "주의") {
    return "신호 톤이 주의라서 진입 전 추가 확인이 필요합니다.";
  }
  if (resolveValidationBasis(item) === "보수 계산") {
    return "실측 표본이 부족해 보수 계산이 섞여 있습니다.";
  }
  if (item.eventCoverage === "취약" || !item.eventCoverage) {
    return "뉴스·이벤트 근거는 약한 편입니다.";
  }
  if (item.invalidationDistance > -4) {
    return "무효화 구간이 가까워 손절 기준을 타이트하게 봐야 합니다.";
  }

  return "조건은 괜찮지만 추격보다는 눌림 확인이 더 유리합니다.";
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
  const strongCount = filteredItems.filter((item) => getCandidateLabel(item) === "오늘 바로 볼 후보").length;
  const enoughInvalidationCount = filteredItems.filter((item) => item.invalidationDistance <= -6).length;
  const verifiedCount = filteredItems.filter((item) => resolveValidationBasis(item) !== "보수 계산").length;

  return (
    <div>
      <section className="mb-8 grid gap-4 rounded-3xl border border-border/70 bg-card/50 p-5 lg:grid-cols-[1.4fr_160px_160px_160px_170px_180px_auto] lg:items-end">
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
        <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
          현재 관찰 종목 <span className="font-semibold text-foreground">{filteredItems.length}</span>개
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        <TrustCard label="오늘 바로 볼 후보" value={strongCount} tone="emerald" detail="상위권 또는 긍정 신호 기준" />
        <TrustCard label="무효화 여유 확보" value={enoughInvalidationCount} tone="sky" detail="무효화 거리 -6% 이하" />
        <TrustCard label="실측·참고 기반" value={verifiedCount} tone="teal" detail="보수 계산 외 검증 근거" />
        <TrustCard
          label="필터 내 전체 후보"
          value={filteredItems.length}
          tone="amber"
          detail={additionalCount > 0 ? `상위 ${shortlist.length}개 우선 노출` : "현재 후보를 모두 표시 중"}
        />
      </section>

      <section className="mb-6 rounded-3xl border border-border/70 bg-card/40 px-5 py-4">
        <p className="text-sm font-semibold text-foreground">오늘은 이렇게 보시면 됩니다.</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          숫자 자체보다 먼저 봐야 할 것은 왜 이 종목을 지금 보는지, 그리고 무엇이 아직 부족한지입니다. 아래 카드는 오늘 우선해서 볼 후보만
          추려 보여주고, 더 넓은 비교는 표에서 이어서 확인할 수 있게 구성했습니다.
        </p>
      </section>

      <section className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">현재 관찰 종목 기준 검증 분포</h2>
          <p className="text-sm text-muted-foreground">{filteredItems.length}개 종목 기준</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <TrustCard label="실측 기반" value={filteredTrustSummary["실측 기반"]} tone="emerald" />
          <TrustCard label="공용 추적 참고" value={filteredTrustSummary["공용 추적 참고"]} tone="teal" />
          <TrustCard label="유사 업종 참고" value={filteredTrustSummary["유사 업종 참고"]} tone="sky" />
          <TrustCard label="유사 흐름 참고" value={filteredTrustSummary["유사 흐름 참고"]} tone="amber" />
          <TrustCard label="보수 계산" value={filteredTrustSummary["보수 계산"]} tone="rose" />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">전체 분석 종목 기준 검증 분포</h2>
          <p className="text-sm text-muted-foreground">{items.length}개 종목 기준</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <TrustCard label="실측 기반" value={trustSummary["실측 기반"]} tone="emerald" />
          <TrustCard label="공용 추적 참고" value={trustSummary["공용 추적 참고"]} tone="teal" />
          <TrustCard label="유사 업종 참고" value={trustSummary["유사 업종 참고"]} tone="sky" />
          <TrustCard label="유사 흐름 참고" value={trustSummary["유사 흐름 참고"]} tone="amber" />
          <TrustCard label="보수 계산" value={trustSummary["보수 계산"]} tone="rose" />
        </div>
      </section>

      <section className="mb-6">
        <RecommendationsOverview items={filteredItems} dailyScan={dailyScan} />
      </section>

      {shortlist.length ? (
        <>
          <section className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">오늘 우선해서 볼 스윙 후보</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                상위 {shortlist.length}개만 먼저 보여줍니다. 카드를 펼쳐 보며 왜 보는지와 무엇을 조심해야 하는지를 먼저 확인해보세요.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              {additionalCount > 0 ? `나머지 ${additionalCount}개 후보는 아래 표에서 비교` : "현재 필터 기준 모든 후보를 카드로 표시 중"}
            </div>
          </section>
          <section className="grid gap-6 xl:grid-cols-3">
            {shortlist.map((item) => {
              const reasons = buildReasons(item);

              return (
                <div key={item.ticker} className="space-y-3">
                  <div className="rounded-[24px] border border-border/70 bg-secondary/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{getCandidateLabel(item)}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{getWatchout(item)}</p>
                      </div>
                      {item.featuredRank ? (
                        <span className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                          오늘 후보 #{item.featuredRank}
                        </span>
                      ) : null}
                    </div>
                    {reasons.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reasons.map((reason) => (
                          <span
                            key={`${item.ticker}-${reason}`}
                            className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <RecommendationCard item={item} isFavorite={isFavorite(item.ticker)} onToggleFavorite={toggleFavorite} />
                </div>
              );
            })}
          </section>
          <section className="mt-6">
            <RecommendationTable items={filteredItems} favorites={favorites} onToggleFavorite={toggleFavorite} />
          </section>
        </>
      ) : (
        <section className="rounded-3xl border border-border/70 bg-card/40 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">조건에 맞는 관찰 종목이 없습니다.</p>
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
  tone,
  detail
}: {
  label: string;
  value: number | string;
  tone: "emerald" | "teal" | "sky" | "amber" | "rose";
  detail?: string;
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
      {detail ? <p className="mt-2 text-xs leading-5 opacity-80">{detail}</p> : null}
    </div>
  );
}
