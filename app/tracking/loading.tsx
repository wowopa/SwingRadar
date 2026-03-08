import { PageLoading } from "@/components/shared/page-loading";

export default function TrackingLoading() {
  return (
    <PageLoading
      eyebrow="Tracking"
      title="지난 흐름을 불러오는 중입니다"
      description="얼마나 올랐고 얼마나 밀렸는지, 관련 뉴스와 메모를 함께 준비하고 있습니다."
      cards={2}
    />
  );
}
