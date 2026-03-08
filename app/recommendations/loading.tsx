import { PageLoading } from "@/components/shared/page-loading";

export default function RecommendationsLoading() {
  return (
    <PageLoading
      eyebrow="Recommendations"
      title="관찰 신호 보드를 불러오는 중입니다"
      description="신호 톤, 무효화 조건, 검증 통계를 정리하고 있습니다."
      cards={3}
    />
  );
}