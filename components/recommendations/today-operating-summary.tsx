import Link from "next/link";
import { ArrowUpRight, Binoculars, CircleOff, LayoutDashboard, TimerReset, WalletCards } from "lucide-react";

import { ActionBucketBadge } from "@/components/recommendations/action-bucket-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodayActionSummaryDto, TodayOperatingWorkflowDto } from "@/lib/api-contracts/swing-radar";
import {
  buildTodayOperatingWorkflow,
  buildTodayOperatingSummary,
  bucketRecommendationActions,
  getRecommendationActionMeta,
  type RecommendationActionBucket,
  type RecommendationActionItem
} from "@/lib/recommendations/action-plan";

const bucketIcons = {
  buy_now: ArrowUpRight,
  watch_only: Binoculars,
  avoid: CircleOff
} satisfies Record<RecommendationActionBucket, typeof ArrowUpRight>;

const emptyMessages: Record<RecommendationActionBucket, string> = {
  buy_now: "장초 재판정까지 볼 종목은 아직 없습니다.",
  watch_only: "추가 관찰이 필요한 종목은 많지 않습니다.",
  avoid: "현재 상위 후보 중 즉시 보류로 보는 종목은 많지 않습니다."
};

const workflowIcons = {
  preopen_candidates: LayoutDashboard,
  opening_recheck: TimerReset,
  today_action: ArrowUpRight
} as const;

export function TodayOperatingSummary({
  items,
  summary,
  workflow
}: {
  items: RecommendationActionItem[];
  summary?: TodayActionSummaryDto;
  workflow?: TodayOperatingWorkflowDto;
}) {
  const resolvedSummary = summary ?? buildTodayOperatingSummary(items);
  const resolvedWorkflow = workflow ?? buildTodayOperatingWorkflow(resolvedSummary);
  const buckets = bucketRecommendationActions(items);
  const sections: RecommendationActionBucket[] = ["buy_now", "watch_only", "avoid"];

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ActionBucketBadge bucket={resolvedSummary.maxNewPositions > 0 ? "buy_now" : "watch_only"} />
              <span className="rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground/78">
                오늘 운영 모드
              </span>
            </div>
            <div className="space-y-3">
              <CardTitle className="text-2xl text-foreground">{resolvedSummary.marketStanceLabel}</CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">{resolvedSummary.summary}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-border/70 bg-secondary/25 p-4 text-sm leading-6 text-foreground/82">
              {resolvedSummary.focusNote}
            </div>
            <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
              {resolvedWorkflow.staleDataNote}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryMetric
            title="신규 매수 최대"
            value={`${resolvedSummary.maxNewPositions}개`}
            note="오늘 새로 볼 수 있는 최대 진입 수"
            icon={ArrowUpRight}
          />
          <SummaryMetric
            title="동시 관리 기준"
            value={`${resolvedSummary.maxConcurrentPositions}개`}
            note="같이 들고 갈 총 종목 수 기준"
            icon={WalletCards}
          />
          <SummaryMetric
            title="장초 통과 후보"
            value={`${resolvedSummary.bucketCounts.buy_now}개`}
            note="장초 재판정 통과 시 매수 검토할 종목"
            icon={LayoutDashboard}
          />
          <SummaryMetric
            title="관찰만"
            value={`${resolvedSummary.bucketCounts.watch_only}개`}
            note="추격보다 확인이 먼저인 종목"
            icon={Binoculars}
          />
        </div>
      </div>

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">오늘은 이 3단계로 봅니다</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {resolvedWorkflow.basisLabel}으로 후보를 만들고, {resolvedWorkflow.recheckWindowLabel} 동안 다시 확인한 뒤 실제 행동으로 옮깁니다.
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs font-medium text-foreground/78">
              {resolvedWorkflow.recheckWindowLabel} 재판정
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            {resolvedWorkflow.steps.map((step) => {
              const Icon = workflowIcons[step.key];

              return (
                <div key={step.key} className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background/85 text-foreground/72">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="mt-2 text-sm leading-6 text-foreground/82">{step.summary}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-[24px] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">장초 재판정 체크리스트</p>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {resolvedWorkflow.openingChecklist.map((item) => (
                <div key={item.key} className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-positive">통과 시</p>
                  <p className="mt-1 text-sm leading-6 text-foreground/82">{item.passLabel}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-caution">미통과 시</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.failLabel}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {sections.map((bucket) => {
          const meta = getRecommendationActionMeta(bucket);
          const Icon = bucketIcons[bucket];
          const bucketItems = buckets[bucket].slice(0, 3);

          return (
            <Card key={bucket} className="border-border/70 bg-white/82 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/40 text-foreground/75">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground">{meta.label}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <ActionBucketBadge bucket={bucket} />
                </div>
              </CardHeader>
              <CardContent>
                {bucketItems.length ? (
                  <div className="space-y-3">
                    {bucketItems.map((item) => (
                      <Link
                        key={`${bucket}-${item.ticker}`}
                        href={`/analysis/${item.ticker}`}
                        className="block rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 transition hover:border-primary/35 hover:bg-secondary/35"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {item.signalLabel ?? "신호와 가격 구조를 함께 보고 다음 행동을 판단합니다."}
                            </p>
                          </div>
                          <span className="rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground/72">
                            {typeof item.activationScore === "number" ? `${item.activationScore.toFixed(0)}점` : `${item.score.toFixed(0)}점`}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
                    {emptyMessages[bucket]}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function SummaryMetric({
  title,
  value,
  note,
  icon: Icon
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof ArrowUpRight;
}) {
  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/40 text-foreground/70">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
