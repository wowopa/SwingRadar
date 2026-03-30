import { ArrowUpRight, Flag, ShieldAlert, Target } from "lucide-react";

import { ActionBucketBadge } from "@/components/recommendations/action-bucket-badge";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisTradePlan } from "@/lib/analysis/action-plan";
import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import type { TickerAnalysis } from "@/types/analysis";

export function AnalysisTradePlanPanel({
  analysis,
  featuredCandidate,
  featuredRank
}: {
  analysis: TickerAnalysis;
  featuredCandidate?: DailyCandidate | null;
  featuredRank?: number;
}) {
  const plan = buildAnalysisTradePlan({
    analysis,
    dailyCandidate: featuredCandidate,
    featuredRank
  });

  return (
    <Card>
      <CardHeader className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBucketBadge bucket={plan.bucket} />
            <SignalToneBadge tone={analysis.signalTone} />
            {featuredRank ? (
              <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs font-medium text-foreground/76">
                오늘 후보 #{featuredRank}
              </span>
            ) : null}
          </div>
          <span className="rounded-full border border-border/70 bg-secondary/25 px-3 py-1 text-xs font-medium text-muted-foreground">
            {plan.bucketDescription}
          </span>
        </div>

        <div className="space-y-3">
          <CardTitle className="text-3xl text-foreground sm:text-[2.15rem]">{plan.title}</CardTitle>
          <p className="text-sm leading-7 text-muted-foreground">{plan.summary}</p>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-secondary/20 p-5">
          <p className="text-sm leading-7 text-foreground/84">{plan.headline}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="현재가 기준" value={plan.currentPriceLabel} note="최신 스냅샷 기준 위치" icon={Flag} />
          <MetricCard label="매수 구간" value={plan.entryLabel} note="지금 접근해도 되는 가격대" icon={ArrowUpRight} />
          <MetricCard label="손절 기준" value={plan.stopLabel} note="틀리면 바로 다시 볼 가격" icon={ShieldAlert} />
          <MetricCard label="1차 목표" value={plan.targetLabel} note="먼저 반응을 확인할 구간" icon={Target} />
          <MetricCard label="예상 보유" value={plan.holdWindowLabel} note="이번 스윙에서 보는 시간 폭" icon={Flag} />
          <MetricCard label="기대 손익비" value={plan.riskRewardLabel} note="확인 가격 기준 대략적 비율" icon={Target} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-[28px] border border-primary/20 bg-primary/8 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">다음 행동</p>
          <p className="mt-3 text-sm leading-7 text-foreground/84">{plan.nextStep}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard title="진입 전에 볼 것" body={plan.entryGuide} />
          <DetailCard title="손절은 이렇게" body={plan.stopGuide} />
          <DetailCard title="목표 구간 읽기" body={`${plan.targetGuide} 확장 목표는 ${plan.stretchTargetLabel} 수준까지 열어 둘 수 있습니다.`} />
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
    <div className="rounded-[24px] border border-border/70 bg-secondary/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-background/80 text-foreground/70">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-3 text-sm leading-7 text-foreground/80">{body}</p>
    </div>
  );
}

function BulletCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
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
