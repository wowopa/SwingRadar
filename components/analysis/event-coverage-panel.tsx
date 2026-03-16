import { GoogleNewsSearchCard } from "@/components/shared/google-news-search-card";

export function EventCoveragePanel({
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
      description="분석 화면에서는 외부 뉴스를 서비스 안에서 직접 큐레이팅하지 않습니다. 관련 뉴스는 구글 뉴스 검색으로 열어 직접 확인해 주세요."
    />
  );
}
