import Link from "next/link";

import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { TrackingSelectionGuide } from "@/components/tracking/tracking-selection-guide";
import { Card, CardContent } from "@/components/ui/card";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SignalsTab = "candidates" | "tracking";

function resolveTab(value?: string | string[]): SignalsTab {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "tracking" ? "tracking" : "candidates";
}

function getOpeningCheckLimit() {
  const parsed = Number(process.env.SWING_RADAR_OPENING_CHECK_LIMIT ?? 5);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
}

function getTrackingConfig() {
  return {
    maxActive: Number(process.env.SWING_RADAR_TRACKING_MAX_ACTIVE ?? 8),
    maxWatch: Number(process.env.SWING_RADAR_TRACKING_MAX_WATCH ?? 12),
    minAverageTurnover20: Number(process.env.SWING_RADAR_TRACKING_MIN_AVG_TURNOVER20 ?? 3000000000),
    minWatchActivationScore: Number(process.env.SWING_RADAR_TRACKING_MIN_WATCH_ACTIVATION_SCORE ?? 52),
    minEntryActivationScore: Number(process.env.SWING_RADAR_TRACKING_MIN_ENTRY_ACTIVATION_SCORE ?? 68),
    minEntryAppearances: Number(process.env.SWING_RADAR_TRACKING_MIN_ENTRY_APPEARANCES ?? 1),
    minEntryAverageTurnover20: Number(process.env.SWING_RADAR_TRACKING_MIN_ENTRY_AVG_TURNOVER20 ?? 3000000000),
    confirmationBufferRatio: Number(process.env.SWING_RADAR_TRACKING_CONFIRMATION_BUFFER_RATIO ?? 0.97),
    cooldownDays: Number(process.env.SWING_RADAR_TRACKING_REENTRY_COOLDOWN_DAYS ?? 5),
    maxWatchDays: Number(process.env.SWING_RADAR_TRACKING_MAX_WATCH_DAYS ?? 7),
    maxHoldingDays: Number(process.env.SWING_RADAR_TRACKING_MAX_HOLDING_DAYS ?? 20)
  };
}

export default async function SignalsPage({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab = resolveTab(resolvedSearchParams.tab);

  const [recommendations, dailyCandidates, tracking] = await Promise.all([
    getRecommendations(),
    getDailyCandidates(),
    getTrackingPayload()
  ]);

  const candidateCount = dailyCandidates?.topCandidates.length ?? recommendations.items.length;
  const openingCheckCount = Math.min(candidateCount, getOpeningCheckLimit());
  const statusSummaries = [
    buildPublicDataStatusSummary(
      dailyCandidates ? "daily-candidates" : "recommendations",
      dailyCandidates?.generatedAt ?? recommendations.generatedAt
    ),
    buildPublicDataStatusSummary("tracking", tracking.generatedAt)
  ];
  const trackingConfig = getTrackingConfig();

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Signals"
        title="서비스 공통 후보"
        description="이 화면은 모두가 함께 보는 공통 후보와 공용 복기를 다룹니다. 실제 오늘 행동과 보유 관리는 Today와 Portfolio에서 개인 기준으로 이어집니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <SignalsTabLink
            href="/signals?tab=candidates"
            title="오늘 후보"
            note={`${candidateCount}개 공통 후보`}
            active={activeTab === "candidates"}
          />
          <SignalsTabLink
            href="/signals?tab=tracking"
            title="공용 복기"
            note={`${tracking.history.length}개 추적 이력`}
            active={activeTab === "tracking"}
          />
        </div>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-foreground">
                {activeTab === "candidates" ? "서비스가 오늘 좋게 보는 후보만 모읍니다" : "공용 추적 결과를 복기하는 화면입니다"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeTab === "candidates"
                  ? `오늘 후보 ${candidateCount}개는 모두가 같은 기준으로 봅니다. 이 가운데 장초 확인 대상으로는 상위 ${openingCheckCount}개만 Today에서 다시 확인합니다.`
                  : "공용 복기는 오늘 행동 화면이 아니라 과거 공용 판단이 실제로 어떻게 끝났는지 되돌아보는 공간입니다."}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              {activeTab === "candidates"
                ? `오늘 후보 ${candidateCount}개 · 장초 확인 기준 ${openingCheckCount}개`
                : `공용 추적 ${tracking.history.length}건`}
            </div>
          </CardContent>
        </Card>
      </section>

      {activeTab === "candidates" ? (
        <section>
          <RecommendationExplorer items={recommendations.items} />
        </section>
      ) : (
        <section className="space-y-6">
          <TrackingSelectionGuide {...trackingConfig} />
          <TrackingDetailPanel history={tracking.history} details={tracking.details} />
        </section>
      )}
    </main>
  );
}

function SignalsTabLink({
  href,
  title,
  note,
  active
}: {
  href: string;
  title: string;
  note: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-[200px] flex-1 items-center justify-between rounded-[24px] border px-4 py-3 transition",
        active
          ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
          : "border-border/70 bg-white/82 text-foreground/80 hover:border-primary/25 hover:bg-white"
      )}
    >
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className={cn("mt-1 text-xs", active ? "text-primary/80" : "text-muted-foreground")}>{note}</p>
      </div>
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium",
          active
            ? "border-primary/25 bg-primary/10 text-primary"
            : "border-border/70 bg-secondary/30 text-foreground/70"
        )}
      >
        {active ? "현재 보기" : "열기"}
      </span>
    </Link>
  );
}
