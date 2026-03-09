import { PageHeader } from "@/components/shared/page-header";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { getTrackingPayload } from "@/lib/repositories/tracking";

export default async function TrackingPage() {
  const tracking = await getTrackingPayload();

  return (
    <main>
      <PageHeader
        eyebrow="Tracking"
        title="추적 워크스페이스"
        description="신호 이후 흐름, 최대 상승폭과 하락폭, 관련 이벤트를 함께 점검하는 화면입니다."
      />
      <TrackingDetailPanel history={tracking.history} details={tracking.details} />
    </main>
  );
}
