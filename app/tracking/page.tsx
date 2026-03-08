import { PageHeader } from "@/components/shared/page-header";
import { TrackingDetailPanel } from "@/components/tracking/tracking-detail-panel";
import { getTrackingPayload } from "@/lib/repositories/tracking";

export default async function TrackingPage() {
  const tracking = await getTrackingPayload();

  return (
    <main>
      <PageHeader
        eyebrow="Tracking"
        title="지난 흐름 다시 보기"
        description="관찰했던 종목이 이후 어떻게 움직였는지, 가장 많이 오른 폭과 밀린 폭까지 쉽게 살펴보는 화면입니다."
      />
      <TrackingDetailPanel history={tracking.history} details={tracking.details} />
    </main>
  );
}
