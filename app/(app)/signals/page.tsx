import Link from "next/link";

import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { TrackingSelectionGuide } from "@/components/tracking/tracking-selection-guide";
import { Badge } from "@/components/ui/badge";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";
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

  const session = await getCurrentUserSession();
  const [recommendations, tracking] = await Promise.all([
    listRecommendations({ sort: "score_desc" }, { userId: session?.user.id }),
    getTrackingPayload()
  ]);

  const candidateCount = recommendations.dailyScan?.topCandidates.length ?? recommendations.items.length;
  const openingCheckCount = Math.min(candidateCount, getOpeningCheckLimit());
  const statusSummaries = [
    buildPublicDataStatusSummary(
      recommendations.dailyScan ? "daily-candidates" : "recommendations",
      recommendations.dailyScan?.generatedAt ?? recommendations.generatedAt
    ),
    buildPublicDataStatusSummary("tracking", tracking.generatedAt)
  ];
  const trackingConfig = getTrackingConfig();
  const personalActionByTicker = Object.fromEntries(
    (recommendations.todayActionBoard?.items ?? []).map((item) => [item.ticker, item])
  );

  return (
    <main className="space-y-5">
      <PageHeader eyebrow="Signals" title="서비스 공통 후보" />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <SignalsTabLink
            href="/signals?tab=candidates"
            title="오늘 후보"
            count={`${candidateCount}개`}
            active={activeTab === "candidates"}
          />
          <SignalsTabLink
            href="/signals?tab=tracking"
            title="공용 복기"
            count={`${tracking.history.length}건`}
            active={activeTab === "tracking"}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === "candidates" ? (
            <>
              <Badge variant="neutral">공통 후보 {candidateCount}개</Badge>
              <Badge variant="secondary">장초 확인 기준 {openingCheckCount}개</Badge>
            </>
          ) : (
            <>
              <Badge variant="neutral">공용 추적 {tracking.history.length}건</Badge>
              <Badge variant="secondary">복기용 이력</Badge>
            </>
          )}
        </div>
      </section>

      {activeTab === "candidates" ? (
        <section>
          <RecommendationExplorer
            items={recommendations.items}
            openingCheckRiskPatterns={recommendations.openingCheckRiskPatterns}
            openingCheckPositivePattern={recommendations.openingCheckPositivePattern}
            openingCheckCandidateTickers={
              (recommendations.dailyScan?.openingCheckCandidates ?? []).map((item) => item.ticker)
            }
            personalActionByTicker={personalActionByTicker}
            marketSession={recommendations.marketSession}
          />
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
  count,
  active
}: {
  href: string;
  title: string;
  count: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-[170px] flex-1 items-center justify-between rounded-[22px] border px-4 py-3 transition",
        active
          ? "border-primary/24 bg-[linear-gradient(145deg,rgba(24,32,42,0.98),rgba(34,41,54,0.94))] text-primary-foreground shadow-[0_20px_48px_-34px_rgba(24,32,42,0.68)]"
          : "border-border/80 bg-[hsl(42_40%_97%)] text-foreground hover:border-primary/24 hover:bg-white"
      )}
    >
      <span className="text-sm font-semibold">{title}</span>
      <Badge variant={active ? "neutral" : "secondary"}>{count}</Badge>
    </Link>
  );
}
