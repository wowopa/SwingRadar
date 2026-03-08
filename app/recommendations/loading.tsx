import { PageLoading } from "@/components/shared/page-loading";

export default function RecommendationsLoading() {
  return (
    <PageLoading
      eyebrow="Recommendations"
      title="관찰 종목을 불러오는 중입니다"
      description="가격 기준과 참고할 이유를 보기 쉽게 정리하고 있습니다."
      cards={3}
    />
  );
}
