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
        title="공용 추적 워크스페이스"
        description="서비스가 감시하고 실제로 추적 중인 종목의 흐름, 결과, 종료 이유를 한 화면에서 확인합니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <TrackingDetailPanel history={tracking.history} details={tracking.details} />
    </main>
  );
}
