import { GoogleNewsSearchCard } from "@/components/shared/google-news-search-card";

export function NewsHistoryCards({
  ticker,
  company
}: {
  ticker: string;
  company: string;
}) {
  return (
    <GoogleNewsSearchCard
      title="관련 종목 뉴스 검색"
      ticker={ticker}
      company={company}
      description="공용 추적 화면에서는 개별 기사 큐레이션 대신, 필요할 때 종목 뉴스를 직접 검색해 확인할 수 있도록 구글 뉴스 검색으로 연결합니다."
    />
  );
}
