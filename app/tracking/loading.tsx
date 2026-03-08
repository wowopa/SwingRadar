import { PageLoading } from "@/components/shared/page-loading";

export default function TrackingLoading() {
  return (
    <PageLoading
      eyebrow="Tracking"
      title="사후 추적 데이터를 불러오는 중입니다"
      description="신호 이력, MFE/MAE, 히스토리컬 뉴스와 점수 로그를 준비하고 있습니다."
      cards={2}
    />
  );
}