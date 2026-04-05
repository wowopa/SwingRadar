import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Flag, ShieldAlert, Target } from "lucide-react";

import { ActionBucketBadge } from "@/components/recommendations/action-bucket-badge";
import { PersonalActionStatusBadge } from "@/components/recommendations/personal-action-status-badge";
import { RecommendationTrustSummary } from "@/components/recommendations/recommendation-trust-summary";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisTradePlan } from "@/lib/analysis/action-plan";
import type {
  OpeningCheckPositivePatternDto,
  OpeningCheckRiskPatternDto,
  TodayActionBoardItemDto
} from "@/lib/api-contracts/swing-radar";
import { getFeaturedRankLabel } from "@/lib/copy/action-language";
import { buildOpeningCheckPatternPreview } from "@/lib/recommendations/opening-check-pattern-preview";
import { buildRecommendationTrustSummary } from "@/lib/recommendations/recommendation-trust";
import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import type { TickerAnalysis } from "@/types/analysis";

type PersonalActionPreview = Pick<TodayActionBoardItemDto, "boardStatus" | "boardReason" | "portfolioNote">;

export function AnalysisTradePlanPanel({
  ticker,
  analysis,
  featuredCandidate,
  featuredRank,
  openingCheckRiskPatterns = [],
  openingCheckPositivePattern,
  personalActionItem
}: {
  ticker: string;
  analysis: TickerAnalysis;
  featuredCandidate?: DailyCandidate | null;
  featuredRank?: number;
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  openingCheckPositivePattern?: OpeningCheckPositivePatternDto;
  personalActionItem?: PersonalActionPreview | null;
}) {
  const plan =
    analysis.tradePlan ??
    buildAnalysisTradePlan({
      analysis,
      dailyCandidate: featuredCandidate,
      featuredRank
    });

  const patternPreview = buildOpeningCheckPatternPreview(
    {
      actionBucket: plan.bucket,
      tradePlan: {
        currentPrice: plan.currentPrice ?? featuredCandidate?.currentPrice ?? null,
        confirmationPrice: plan.confirmationPrice ?? featuredCandidate?.confirmationPrice ?? null,
        entryPriceLow: plan.entryPriceLow ?? null,
        entryPriceHigh: plan.entryPriceHigh ?? null
      }
    },
    {
      riskPatterns: openingCheckRiskPatterns,
      positivePattern: openingCheckPositivePattern
    }
  );
  const trustSummary =
    analysis.validation
      ? buildRecommendationTrustSummary({
          validation: analysis.validation,
          validationBasis: analysis.validationBasis,
          validationInsight: analysis.validationInsight,
          trackingDiagnostic: analysis.trackingDiagnostic,
          patternPreview
        })
      : null;

  const actionFlow = buildActionFlow({ ticker, featuredRank, personalActionItem });

  return (
    <Card
      data-tutorial="analysis-plan"
      className="border-border/80 bg-white/92 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]"
    >
      <CardHeader className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBucketBadge bucket={plan.bucket} />
            <SignalToneBadge tone={analysis.signalTone} />
            {featuredRank ? (
              <span className="rounded-full border border-primary/22 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {getFeaturedRankLabel(featuredRank)}
              </span>
            ) : null}
            {personalActionItem ? <PersonalActionStatusBadge item={personalActionItem} /> : null}
          </div>
          <span className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1 text-xs font-medium text-muted-foreground">
            {plan.bucketDescription}
          </span>
        </div>

        <div className="space-y-3">
          <CardTitle className="text-3xl text-foreground sm:text-[2.15rem]">{plan.title}</CardTitle>
          <p className="text-sm leading-7 text-muted-foreground">{plan.summary}</p>
        </div>

        <div className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,241,232,0.9))] p-5">
          <p className="text-sm leading-7 text-foreground/84">{plan.headline}</p>
        </div>

        {trustSummary ? (
          <div data-tutorial="analysis-trust">
            <RecommendationTrustSummary summary={trustSummary} />
          </div>
        ) : null}

        <div data-tutorial="analysis-action-flow" className="grid gap-3 md:grid-cols-3">
          <ActionFlowStep
            label="공통 후보"
            value={actionFlow.sharedLabel}
            note={actionFlow.sharedNote}
            badge={featuredRank ? <Badge variant="neutral">{getFeaturedRankLabel(featuredRank)}</Badge> : null}
          />
          <ActionFlowStep
            label="내 기준 해석"
            value={actionFlow.personalLabel}
            note={actionFlow.personalNote}
            badge={
              personalActionItem ? (
                <div className="flex flex-wrap items-center gap-2">
                  <PersonalActionStatusBadge item={personalActionItem} />
                  {personalActionItem.portfolioNote ? <Badge variant="neutral">{personalActionItem.portfolioNote}</Badge> : null}
                </div>
              ) : null
            }
          />
          <ActionFlowStep
            label="다음 이동"
            value={actionFlow.nextLabel}
            note={actionFlow.nextNote}
            badge={
              <Link
                href={actionFlow.href}
                className="inline-flex items-center rounded-full border border-primary/24 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/14"
              >
                {actionFlow.hrefLabel}
              </Link>
            }
          />
        </div>

        {patternPreview ? (
          <div
            className={`rounded-[24px] p-4 ${
              patternPreview.kind === "risk"
                ? "border border-caution/24 bg-[hsl(var(--caution)/0.08)]"
                : "border border-positive/24 bg-[hsl(var(--positive)/0.08)]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={patternPreview.kind === "risk" ? "caution" : "positive"}>
                {patternPreview.label}
              </Badge>
              <p className="text-sm font-medium text-foreground">{patternPreview.title}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/82">{patternPreview.detail}</p>
          </div>
        ) : openingCheckRiskPatterns.length ? (
          <div className="rounded-[24px] border border-caution/24 bg-[hsl(var(--caution)/0.08)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="caution">최근 장초 주의 패턴</Badge>
              <p className="text-sm font-medium text-foreground">최근 반복 손실이 많았던 장초 조합입니다.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {openingCheckRiskPatterns.slice(0, 2).map((pattern) => (
                <span
                  key={pattern.id}
                  className="rounded-full border border-caution/22 bg-white/88 px-3 py-1.5 text-xs leading-5 text-foreground/82"
                >
                  {pattern.title} · 손실 {pattern.lossCount}건
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div data-tutorial="analysis-metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="현재가 기준" value={plan.currentPriceLabel} note="최신 스냅샷 기준 가격 위치" icon={Flag} />
          <MetricCard label="매수 구간" value={plan.entryLabel} note="지금 계획으로 확인할 가격 범위" icon={ArrowUpRight} />
          <MetricCard label="손절 기준" value={plan.stopLabel} note="틀리면 다시 볼 가격" icon={ShieldAlert} />
          <MetricCard label="1차 목표" value={plan.targetLabel} note="먼저 반응을 확인할 구간" icon={Target} />
          <MetricCard label="예상 보유" value={plan.holdWindowLabel} note="이번 스윙에서 보는 시간축" icon={Flag} />
          <MetricCard label="기대 손익비" value={plan.riskRewardLabel} note="확인 가격 기준 기대 비율" icon={Target} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          data-tutorial="analysis-next-action"
          className="rounded-[28px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.1),rgba(255,255,255,0.94))] p-5"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">다음 행동</p>
          <p className="mt-3 text-sm leading-7 text-foreground/84">{plan.nextStep}</p>
        </div>

        <div data-tutorial="analysis-guides" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailCard title="진입 전에 볼 것" body={plan.entryGuide} />
            <DetailCard title="손절은 이렇게" body={plan.stopGuide} />
            <DetailCard title="목표 구간 읽기" body={`${plan.targetGuide} 확장 목표는 ${plan.stretchTargetLabel}까지 이어집니다.`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <BulletCard title="왜 지금 보는가" items={plan.supportPoints} />
            <BulletCard title="조심할 점" items={plan.cautionPoints} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildActionFlow({
  ticker,
  featuredRank,
  personalActionItem
}: {
  ticker: string;
  featuredRank?: number;
  personalActionItem?: PersonalActionPreview | null;
}) {
  const sharedLabel = featuredRank ? `공통 후보 ${featuredRank}위` : "공통 후보 밖";
  const sharedNote = featuredRank
    ? "서비스 공통 후보에서는 상단 우선순위에 포함된 종목입니다."
    : "공통 후보 상단 순위에는 없어서 비교 기준으로 보는 종목입니다.";

  if (!personalActionItem) {
    return {
      sharedLabel,
      sharedNote,
      personalLabel: "내 기준 해석 전",
      personalNote: "Today와 Opening Check 기준이 아직 연결되지 않았습니다.",
      nextLabel: "Signals에서 비교",
      nextNote: "공통 후보와 점수 흐름을 먼저 확인하는 단계입니다.",
      href: "/signals?tab=candidates",
      hrefLabel: "Signals 보기"
    };
  }

  const nextByStatus: Record<
    PersonalActionPreview["boardStatus"],
    { personalLabel: string; nextLabel: string; nextNote: string; href: string; hrefLabel: string }
  > = {
    buy_review: {
      personalLabel: "내 기준 매수 검토",
      nextLabel: "Today에서 바로 검토",
      nextNote: "내 계좌 기준으로 오늘 실제 행동 후보에 들어와 있습니다.",
      href: "/recommendations",
      hrefLabel: "Today 보기"
    },
    watch: {
      personalLabel: "내 기준 관찰",
      nextLabel: "Today에서 관찰",
      nextNote: "지금은 더 보고 판단하는 편이 맞는 종목입니다.",
      href: "/recommendations",
      hrefLabel: "Today 보기"
    },
    avoid: {
      personalLabel: "내 기준 보류",
      nextLabel: "보류 유지",
      nextNote: "최근 규칙, 보유 상황, 장초 패턴을 보면 오늘은 뒤로 미루는 편이 낫습니다.",
      href: "/recommendations",
      hrefLabel: "Today 보기"
    },
    excluded: {
      personalLabel: "내 기준 제외",
      nextLabel: "후순위로 보기",
      nextNote: "내 계좌 기준에서는 오늘 행동 후보에서 제외된 상태입니다.",
      href: "/recommendations",
      hrefLabel: "Today 보기"
    },
    pending: {
      personalLabel: "장초 확인 전",
      nextLabel: "Opening Check 먼저",
      nextNote: "내 행동으로 확정되기 전이라 장초 확인을 먼저 마쳐야 합니다.",
      href: `/opening-check?ticker=${ticker}`,
      hrefLabel: "장초 확인"
    }
  };

  const nextConfig = nextByStatus[personalActionItem.boardStatus];

  return {
    sharedLabel,
    sharedNote,
    personalLabel: nextConfig.personalLabel,
    personalNote: personalActionItem.boardReason,
    nextLabel: nextConfig.nextLabel,
    nextNote: nextConfig.nextNote,
    href: nextConfig.href,
    hrefLabel: nextConfig.hrefLabel
  };
}

function ActionFlowStep({
  label,
  value,
  note,
  badge
}: {
  label: string;
  value: string;
  note: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[hsl(42_38%_97%)] p-4">
      <div className="flex min-h-7 flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        {badge}
      </div>
      <p className="mt-3 text-base font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/78">{note}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof ArrowUpRight;
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[hsl(42_38%_97%)] p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-3 text-sm leading-7 text-foreground/80">{body}</p>
    </div>
  );
}

function BulletCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[hsl(42_38%_97%)] p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={`${title}-${item}`} className="text-sm leading-7 text-foreground/80">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
