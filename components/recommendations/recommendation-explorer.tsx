"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { RecommendationTable } from "@/components/recommendations/recommendation-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type {
  OpeningCheckPositivePatternDto,
  OpeningCheckRiskPatternDto,
  TodayActionBoardItemDto
} from "@/lib/api-contracts/swing-radar";
import { getValidationBasisDisplayLabel } from "@/lib/copy/action-language";
import { buildOpeningCheckPatternPreview } from "@/lib/recommendations/opening-check-pattern-preview";
import {
  resolveRecommendationActionBucket,
  type RecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import { useFavoriteTickers } from "@/lib/use-favorite-tickers";
import type { Recommendation, ValidationBasis } from "@/types/recommendation";

type SortKey = "rank" | "score_desc" | "score_asc" | "name";
type ToneFilter = "all" | Recommendation["signalTone"];
type SectorFilter = string;
type FavoriteFilter = "all" | "favorites";
type TrustFilter = "all" | ValidationBasis;
type PersonalActionFilter = "all" | "buy_review" | "watch" | "avoid" | "excluded" | "pending";

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
    emerald: "border-positive/24 bg-[hsl(var(--positive)/0.1)] text-[hsl(var(--positive))]",
    sky: "border-primary/24 bg-primary/10 text-primary",
    amber: "border-neutral/24 bg-[hsl(var(--neutral)/0.12)] text-[hsl(var(--neutral))]",
    stone: "border-border/80 bg-[hsl(42_40%_97%)] text-foreground/78"
  };

  return tones[tone];
}

export function RecommendationExplorer({
  items,
  openingCheckRiskPatterns = [],
  openingCheckPositivePattern,
  openingCheckCandidateTickers = [],
  personalActionByTicker = {}
}: {
  items: Recommendation[];
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  openingCheckPositivePattern?: OpeningCheckPositivePatternDto;
  openingCheckCandidateTickers?: string[];
  personalActionByTicker?: Record<string, TodayActionBoardItemDto>;
}) {
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<ToneFilter>("all");
  const [sector, setSector] = useState<SectorFilter>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const [trustFilter, setTrustFilter] = useState<TrustFilter>("all");
  const [personalActionFilter, setPersonalActionFilter] = useState<PersonalActionFilter>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const { favorites, toggleFavorite } = useFavoriteTickers();
  const openingCheckCandidateSet = useMemo(
    () => new Set(openingCheckCandidateTickers.map((ticker) => ticker.toUpperCase())),
    [openingCheckCandidateTickers]
  );

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
      const personalActionItem = personalActionByTicker[item.ticker];
      const matchesPersonalAction =
        personalActionFilter === "all" || personalActionItem?.boardStatus === personalActionFilter;
      return matchesQuery && matchesTone && matchesSector && matchesFavorite && matchesTrust && matchesPersonalAction;
    });

    next.sort((left, right) => {
      const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;

      if (sort === "rank") {
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return right.score - left.score;
      }

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

      const leftPreview = openingCheckCandidateSet.has(left.ticker.toUpperCase())
        ? buildOpeningCheckPatternPreview(
            {
              actionBucket: getActionBucket(left),
              tradePlan: left.tradePlan
            },
            {
              riskPatterns: openingCheckRiskPatterns,
              positivePattern: openingCheckPositivePattern
            }
          )
        : null;
      const rightPreview = openingCheckCandidateSet.has(right.ticker.toUpperCase())
        ? buildOpeningCheckPatternPreview(
            {
              actionBucket: getActionBucket(right),
              tradePlan: right.tradePlan
            },
            {
              riskPatterns: openingCheckRiskPatterns,
              positivePattern: openingCheckPositivePattern
            }
          )
        : null;
      const leftPreviewPriority =
        leftPreview?.kind === "positive" ? 0 : leftPreview?.kind === "risk" ? 2 : 1;
      const rightPreviewPriority =
        rightPreview?.kind === "positive" ? 0 : rightPreview?.kind === "risk" ? 2 : 1;
      if (leftPreviewPriority !== rightPreviewPriority) {
        return leftPreviewPriority - rightPreviewPriority;
      }

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return right.score - left.score;
    });

    return next;
  }, [favoriteFilter, favorites, items, personalActionByTicker, personalActionFilter, query, sector, sort, tone, trustFilter]);

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

  const personalActionSummary = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        const status = personalActionByTicker[item.ticker]?.boardStatus;
        if (!status) {
          return acc;
        }

        acc[status] += 1;
        return acc;
      },
      {
        buy_review: 0,
        watch: 0,
        avoid: 0,
        excluded: 0,
        pending: 0
      } satisfies Record<Exclude<PersonalActionFilter, "all">, number>
    );
  }, [filteredItems, personalActionByTicker]);

  const hasPersonalActionSummary = useMemo(() => {
    return Object.values(personalActionSummary).some((count) => count > 0);
  }, [personalActionSummary]);

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
  const tableSummary = `매수 검토 ${bucketedItems.buy_now.length}개 · 관찰 ${bucketedItems.watch_only.length}개 · 보류 ${bucketedItems.avoid.length}개`;
  const highlightedRiskPatterns = openingCheckRiskPatterns.slice(0, 2);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="space-y-3 lg:hidden">
        {highlightedRiskPatterns.length ? (
          <details className="rounded-3xl border border-caution/24 bg-[hsl(var(--caution)/0.08)] shadow-[0_18px_46px_-32px_rgba(199,74,71,0.2)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              내 장초 주의 패턴
              <Badge variant="caution">{highlightedRiskPatterns.length}개</Badge>
            </summary>
            <div className="space-y-3 border-t border-caution/16 px-4 py-4">
              {highlightedRiskPatterns.map((pattern) => (
                <RiskPatternRow
                  key={pattern.id}
                  title={pattern.title}
                  stat={`${pattern.count}건 · 손실 ${pattern.lossCount}건 · 승률 ${pattern.winRate}%`}
                />
              ))}
            </div>
          </details>
        ) : null}

        <details className="rounded-3xl border border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.22)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            필터 / 검색
            <Badge variant="secondary">{filteredItems.length}개 표시</Badge>
          </summary>
          <div className="border-t border-border/60 px-4 py-4">
            <MobileFilterPanel
              query={query}
              setQuery={setQuery}
              tone={tone}
              setTone={setTone}
              sector={sector}
              setSector={setSector}
              sectors={sectors}
              favoriteFilter={favoriteFilter}
              setFavoriteFilter={setFavoriteFilter}
              trustFilter={trustFilter}
              setTrustFilter={setTrustFilter}
              personalActionFilter={personalActionFilter}
              setPersonalActionFilter={setPersonalActionFilter}
              sort={sort}
              setSort={setSort}
            />
          </div>
        </details>

        <details className="rounded-3xl border border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.18)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            요약 / 검증 분포
            <Badge variant="secondary">{actionableCount}개 행동 가능</Badge>
          </summary>
          <div className="border-t border-border/60 px-4 py-4">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryCard label="오늘 볼 종목" value={`${actionableCount}개`} detail="매수 검토 + 관찰 종목" tone="emerald" />
                <SummaryCard label="오늘 매수 검토" value={`${bucketedItems.buy_now.length}개`} detail="장초 확인 통과 시 실제로 볼 종목" tone="sky" />
                <SummaryCard label="조금 더 관찰" value={`${bucketedItems.watch_only.length}개`} detail="확인 가격과 반응을 더 볼 종목" tone="amber" />
                <SummaryCard label="보류" value={`${bucketedItems.avoid.length}개`} detail="기본 카드에서는 뒤로 미룹니다" tone="stone" />
              </div>

              <div className="rounded-3xl border border-border/80 bg-[hsl(42_41%_97%)] p-4">
                <div className="flex flex-col gap-3 border-b border-border/60 pb-3">
                  <p className="text-sm font-semibold text-foreground">검증 근거 분포</p>
                  <div className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-sm text-muted-foreground">
                    {countsMatchAll ? `현재는 전체 동일 ${items.length}개` : `현재 ${filteredItems.length}개 / 전체 ${items.length}개`}
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  {VALIDATION_BASIS_OPTIONS.map((basis) => (
                    <BasisRow
                      key={basis}
                      label={basis}
                      filteredCount={filteredTrustSummary[basis]}
                      totalCount={trustSummary[basis]}
                    />
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <SummaryCard label="손절 여유" value={`${enoughInvalidationCount}개`} detail="손절 거리 -6% 이하" tone="amber" />
                  <SummaryCard label="실측 외 검증" value={`${verifiedCount}개`} detail="보수 계산만으로 보지 않는 후보" tone="sky" />
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <section className="hidden gap-4 rounded-3xl border border-border/80 bg-white/90 p-5 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.22)] lg:grid lg:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,0.75fr))] lg:items-end">
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
        <FilterSelect label="내 기준" value={personalActionFilter} onChange={setPersonalActionFilter}>
          <option value="all">전체</option>
          <option value="buy_review">매수 검토</option>
          <option value="watch">관찰</option>
          <option value="avoid">보류</option>
          <option value="excluded">제외</option>
          <option value="pending">장초 확인 전</option>
        </FilterSelect>
        <FilterSelect label="검증 기준" value={trustFilter} onChange={setTrustFilter}>
          <option value="all">전체</option>
          {VALIDATION_BASIS_OPTIONS.map((basis) => (
            <option key={basis} value={basis}>
              {getValidationBasisDisplayLabel(basis)}
            </option>
          ))}
      </FilterSelect>
      <FilterSelect label="정렬" value={sort} onChange={setSort}>
        <option value="rank">순위표 순서</option>
        <option value="score_desc">행동 우선순위</option>
        <option value="score_asc">점수 낮은 순</option>
        <option value="name">종목명순</option>
      </FilterSelect>
      </section>

      <section className="hidden gap-4 xl:grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <div className="space-y-4 rounded-3xl border border-border/80 bg-white/90 p-5 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.18)]">
          <div className="border-b border-border/60 pb-4">
            <p className="text-sm font-semibold text-foreground">행동 중심으로 먼저 봅니다</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              이 화면은 종목을 많이 나열하는 대신, 장초 확인을 통과하면 행동할 수 있는 종목과 더 봐야 하는 종목을 먼저 나눠서 보여줍니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="오늘 볼 종목" value={`${actionableCount}개`} detail="매수 검토 + 관찰 종목" tone="emerald" />
            <SummaryCard label="오늘 매수 검토" value={`${bucketedItems.buy_now.length}개`} detail="장초 확인 통과 시 실제로 볼 종목" tone="sky" />
            <SummaryCard label="조금 더 관찰" value={`${bucketedItems.watch_only.length}개`} detail="확인 가격과 반응을 더 볼 종목" tone="amber" />
            <SummaryCard label="보류" value={`${bucketedItems.avoid.length}개`} detail="기본 카드에서는 뒤로 미룹니다" tone="stone" />
          </div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-white/90 p-5 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.18)]">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">검증 근거 분포</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {countsMatchAll
                  ? "필터를 적용하지 않은 기본 상태라 현재 분포와 전체 분포가 같습니다."
                  : "현재 필터 결과와 전체 종목의 검증 근거를 한 번에 비교합니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-[hsl(42_42%_96%)] px-3 py-2 text-sm text-muted-foreground">
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

      {highlightedRiskPatterns.length ? (
        <section className="rounded-3xl border border-caution/24 bg-[linear-gradient(145deg,hsl(var(--caution)/0.08),rgba(255,255,255,0.92))] p-5 shadow-[0_18px_46px_-32px_rgba(199,74,71,0.18)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="caution">내 장초 주의 패턴</Badge>
            <p className="text-sm font-medium text-foreground">최근 반복 손실이 많았던 장초 조합입니다.</p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {highlightedRiskPatterns.map((pattern) => (
              <RiskPatternRow
                key={pattern.id}
                title={pattern.title}
                stat={`${pattern.count}건 · 손실 ${pattern.lossCount}건 · 승률 ${pattern.winRate}%`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {openingCheckPositivePattern ? (
        <section className="rounded-3xl border border-positive/24 bg-[linear-gradient(145deg,hsl(var(--positive)/0.08),rgba(255,255,255,0.92))] p-5 shadow-[0_18px_46px_-32px_rgba(31,138,99,0.18)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="positive">최근 잘 맞은 장초 조합</Badge>
            <p className="text-sm font-medium text-foreground">{openingCheckPositivePattern.headline}</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/84">{openingCheckPositivePattern.detail}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {openingCheckPositivePattern.title} · {openingCheckPositivePattern.count}건 · 승률{" "}
            {openingCheckPositivePattern.winRate}%
          </p>
        </section>
      ) : null}

      {hasPersonalActionSummary ? (
        <section className="rounded-3xl border border-primary/18 bg-[linear-gradient(145deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] p-5 shadow-[0_18px_46px_-32px_rgba(139,107,46,0.16)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">내 기준 빠른 해석</Badge>
            <p className="text-sm font-medium text-foreground">현재 필터 결과를 내 계좌 기준으로 다시 보면 이렇게 나뉩니다.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="내 기준 매수 검토" value={`${personalActionSummary.buy_review}개`} detail="Today에서 바로 검토" tone="emerald" />
            <SummaryCard label="내 기준 관찰" value={`${personalActionSummary.watch}개`} detail="조금 더 보고 판단" tone="sky" />
            <SummaryCard
              label="내 기준 보류 / 제외"
              value={`${personalActionSummary.avoid + personalActionSummary.excluded}개`}
              detail="최근 규칙과 포트폴리오 기준상 뒤로 미룸"
              tone="amber"
            />
            <SummaryCard label="장초 확인 전" value={`${personalActionSummary.pending}개`} detail="먼저 장초 확인이 필요한 종목" tone="stone" />
          </div>
        </section>
      ) : null}

      {filteredItems.length ? (
        <section id="signals-ranking-table" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">전체 종목 순위표</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                이 화면은 카드보다 비교표 중심으로 봅니다. 필터와 정렬로 종목을 좁힌 뒤, 필요한 종목만 상세 분석으로 들어가면 됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-[hsl(42_42%_96%)] px-4 py-3 text-sm text-muted-foreground">
              {tableSummary}
            </div>
          </div>
          <RecommendationTable
            items={filteredItems}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            openingCheckRiskPatterns={openingCheckRiskPatterns}
            openingCheckPositivePattern={openingCheckPositivePattern}
            openingCheckCandidateTickers={openingCheckCandidateTickers}
            personalActionByTicker={personalActionByTicker}
          />
        </section>
      ) : (
        <section className="rounded-3xl border border-border/80 bg-white/90 p-8 text-center shadow-[0_18px_46px_-32px_rgba(24,32,42,0.18)]">
          <p className="text-lg font-semibold text-foreground">조건에 맞는 종목이 없습니다.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            검색어 또는 섹터, 검증 기준 조건을 조금 더 넓히면 더 많은 종목을 볼 수 있습니다.
          </p>
        </section>
      )}

    </div>
  );
}

function RiskPatternRow({ title, stat }: { title: string; stat: string }) {
  return (
    <div className="rounded-2xl border border-caution/22 bg-white/88 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{stat}</p>
    </div>
  );
}

function MobileFilterPanel({
  query,
  setQuery,
  tone,
  setTone,
  sector,
  setSector,
  sectors,
  favoriteFilter,
  setFavoriteFilter,
  trustFilter,
  setTrustFilter,
  personalActionFilter,
  setPersonalActionFilter,
  sort,
  setSort
}: {
  query: string;
  setQuery: (value: string) => void;
  tone: ToneFilter;
  setTone: (value: ToneFilter) => void;
  sector: SectorFilter;
  setSector: (value: SectorFilter) => void;
  sectors: string[];
  favoriteFilter: FavoriteFilter;
  setFavoriteFilter: (value: FavoriteFilter) => void;
  trustFilter: TrustFilter;
  setTrustFilter: (value: TrustFilter) => void;
  personalActionFilter: PersonalActionFilter;
  setPersonalActionFilter: (value: PersonalActionFilter) => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
}) {
  return (
    <section className="grid gap-4">
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
      <FilterSelect label="내 기준" value={personalActionFilter} onChange={setPersonalActionFilter}>
        <option value="all">전체</option>
        <option value="buy_review">매수 검토</option>
        <option value="watch">관찰</option>
        <option value="avoid">보류</option>
        <option value="excluded">제외</option>
        <option value="pending">장초 확인 전</option>
      </FilterSelect>
      <FilterSelect label="검증 기준" value={trustFilter} onChange={setTrustFilter}>
        <option value="all">전체</option>
        {VALIDATION_BASIS_OPTIONS.map((basis) => (
          <option key={basis} value={basis}>
            {getValidationBasisDisplayLabel(basis)}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="정렬" value={sort} onChange={setSort}>
        <option value="rank">순위표 순서</option>
        <option value="score_desc">행동 우선순위</option>
        <option value="score_asc">점수 낮은 순</option>
        <option value="name">종목명순</option>
      </FilterSelect>
    </section>
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
        className="flex h-11 w-full rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] px-3 text-sm text-foreground outline-none transition focus:border-primary/55 focus:bg-white"
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
    <div className={`rounded-3xl border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${getToneClasses(tone)}`}>
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{getValidationBasisDisplayLabel(label)}</p>
        <p className="text-xs text-muted-foreground">{isSame ? "현재와 전체 기준이 동일합니다." : "현재 필터와 전체 기준 비교"}</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {isSame ? (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary">
            동일 {totalCount}
          </span>
        ) : (
          <>
            <span className="rounded-full border border-primary/24 bg-primary/10 px-3 py-1 font-medium text-primary">
              현재 {filteredCount}
            </span>
            <span className="rounded-full border border-border/80 bg-white/82 px-3 py-1 text-muted-foreground">
              전체 {totalCount}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

