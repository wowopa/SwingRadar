import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";

export default async function TrackingPage() {
  const tracking = await getTrackingPayload();
  const statusSummary = buildPublicDataStatusSummary("tracking", tracking.generatedAt);

  return (
    <main>
      <PageHeader
        eyebrow="Tracking"
        title="추적 워크스페이스"
        description="신호 이후 흐름, 최대 상승폭과 하락폭, 관련 이벤트를 한 번에 살펴보는 화면입니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <TrackingDetailPanel history={tracking.history} details={tracking.details} />
    </main>
  );
}
