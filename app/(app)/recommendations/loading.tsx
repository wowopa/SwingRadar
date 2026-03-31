import { PageLoading } from "@/components/shared/page-loading";

export default function RecommendationsLoading() {
  return (
    <PageLoading
      eyebrow="Recommendations"
      title="대시보드를 불러오는 중입니다"
      description="오늘 행동과 먼저 볼 종목을 보기 쉽게 정리하고 있습니다."
      cards={3}
    />
  );
}
