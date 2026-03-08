import { PageLoading } from "@/components/shared/page-loading";

export default function RootLoading() {
  return (
    <PageLoading
      eyebrow="Loading"
      title="SWING-RADAR 데이터를 불러오는 중입니다"
      description="초기 화면 구성과 핵심 관찰 신호 데이터를 준비하고 있습니다."
      cards={3}
    />
  );
}