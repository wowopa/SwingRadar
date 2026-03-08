import { PageLoading } from "@/components/shared/page-loading";

export default function AnalysisLoading() {
  return (
    <PageLoading
      eyebrow="Analysis"
      title="심화 분석 데이터를 불러오는 중입니다"
      description="점수 분해, 시나리오, 무효화 조건, 뉴스와 데이터 품질을 준비하고 있습니다."
      cards={2}
    />
  );
}