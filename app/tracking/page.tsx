import { PageHeader } from "@/components/shared/page-header";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { getTrackingPayload } from "@/lib/repositories/tracking";

export default async function TrackingPage() {
  const tracking = await getTrackingPayload();

  return (
    <main>
      <PageHeader
        eyebrow="Tracking"
        title="사후 추적 워크스페이스"
        description="신호 발생 이후 결과, MFE/MAE, 보유 기간, 이벤트 히스토리와 점수 계산 로그까지 드릴다운으로 검증하는 구조입니다."
      />
      <TrackingDetailPanel history={tracking.history} details={tracking.details} />
    </main>
  );
}
