import { ArrowUpRight, Flag, ShieldAlert, Target } from "lucide-react";

import { ActionBucketBadge } from "@/components/recommendations/action-bucket-badge";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisTradePlan } from "@/lib/analysis/action-plan";
import type { OpeningCheckRiskPatternDto } from "@/lib/api-contracts/swing-radar";
import { getFeaturedRankLabel } from "@/lib/copy/action-language";
import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import type { TickerAnalysis } from "@/types/analysis";

export function AnalysisTradePlanPanel({
  analysis,
  featuredCandidate,
  featuredRank,
  openingCheckRiskPatterns = []
}: {
  analysis: TickerAnalysis;
  featuredCandidate?: DailyCandidate | null;
  featuredRank?: number;
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
}) {
  const plan =
    analysis.tradePlan ??
    buildAnalysisTradePlan({
      analysis,
      dailyCandidate: featuredCandidate,
      featuredRank
    });

  return (
    <Card className="border-border/80 bg-white/92 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
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

        {openingCheckRiskPatterns.length ? (
          <div className="rounded-[24px] border border-caution/24 bg-[hsl(var(--caution)/0.08)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="caution">내 장초 주의 패턴</Badge>
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="현재가 기준" value={plan.currentPriceLabel} note="최신 데이터 기준 위치" icon={Flag} />
          <MetricCard label="매수 구간" value={plan.entryLabel} note="지금 계획을 세워볼 가격대" icon={ArrowUpRight} />
          <MetricCard label="손절 기준" value={plan.stopLabel} note="틀리면 다시 볼 가격" icon={ShieldAlert} />
          <MetricCard label="1차 목표" value={plan.targetLabel} note="먼저 반응을 확인할 구간" icon={Target} />
          <MetricCard label="예상 보유" value={plan.holdWindowLabel} note="이번 스윙에서 보는 시간축" icon={Flag} />
          <MetricCard label="기대 손익비" value={plan.riskRewardLabel} note="확인 가격 기준 기대 비율" icon={Target} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-[28px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.1),rgba(255,255,255,0.94))] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">다음 행동</p>
          <p className="mt-3 text-sm leading-7 text-foreground/84">{plan.nextStep}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard title="진입 전에 볼 것" body={plan.entryGuide} />
          <DetailCard title="손절은 이렇게" body={plan.stopGuide} />
          <DetailCard title="목표 구간 읽기" body={`${plan.targetGuide} 확장 목표는 ${plan.stretchTargetLabel}까지 열어 둘 수 있습니다.`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BulletCard title="왜 지금 보는가" items={plan.supportPoints} />
          <BulletCard title="조심할 점" items={plan.cautionPoints} />
        </div>
      </CardContent>
    </Card>
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
