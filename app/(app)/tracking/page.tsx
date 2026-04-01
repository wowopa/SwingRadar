import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { TrackingSelectionGuide } from "@/components/tracking/tracking-selection-guide";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const tracking = await getTrackingPayload();
  const statusSummary = buildPublicDataStatusSummary("tracking", tracking.generatedAt);
  const trackingConfig = {
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

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Signals"
        title="공용 추적 복기"
        description="서비스가 어떤 종목을 공용으로 봤고, 그 판단이 어떻게 끝났는지를 다시 보는 복기 화면입니다. 오늘 장초 확인이나 개인 행동을 입력하는 화면은 아닙니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <TrackingSelectionGuide {...trackingConfig} />
      <TrackingDetailPanel history={tracking.history} details={tracking.details} />
    </main>
  );
}
