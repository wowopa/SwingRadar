import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyCandidates, getDailyCandidatesHistory } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { formatDateTimeShort, formatPercent, formatPrice } from "@/lib/utils";

function formatTurnover(value?: number | null) {
  if (!value || value <= 0) {
    return "-";
  }

  const eok = value / 100_000_000;
  return `${eok.toFixed(eok >= 100 ? 0 : 1)}억`;
}

function buildHistorySummary(
  history: Awaited<ReturnType<typeof getDailyCandidatesHistory>>
) {
  const appearanceMap = new Map<
    string,
    {
      ticker: string;
      company: string;
      appearances: number;
      bestRank: number;
      latestRank: number;
      lastSeenAt: string;
    }
  >();

  for (const run of history?.runs ?? []) {
    for (const [index, item] of run.topCandidates.entries()) {
      const current = appearanceMap.get(item.ticker);
      const rank = index + 1;

      if (!current) {
        appearanceMap.set(item.ticker, {
          ticker: item.ticker,
          company: item.company,
          appearances: 1,
          bestRank: rank,
          latestRank: rank,
          lastSeenAt: run.generatedAt
        });
        continue;
      }

      current.appearances += 1;
      current.bestRank = Math.min(current.bestRank, rank);
      if (run.generatedAt >= current.lastSeenAt) {
        current.latestRank = rank;
        current.lastSeenAt = run.generatedAt;
      }
    }
  }

  return [...appearanceMap.values()]
    .sort((left, right) => {
      if (right.appearances !== left.appearances) {
        return right.appearances - left.appearances;
      }
      if (left.bestRank !== right.bestRank) {
        return left.bestRank - right.bestRank;
      }
      return left.ticker.localeCompare(right.ticker);
    })
    .slice(0, 30);
}

export default async function RankingPage() {
  const [recommendations, dailyCandidates, history] = await Promise.all([
    getRecommendations(),
    getDailyCandidates(),
    getDailyCandidatesHistory()
  ]);

  const recommendationMap = new Map(recommendations.items.map((item) => [item.ticker, item]));
  const todayRanking = (dailyCandidates?.topCandidates ?? []).map((item, index) => ({
    ...item,
    rank: index + 1,
    recommendation: recommendationMap.get(item.ticker)
  }));
  const historySummary = buildHistorySummary(history);

  return (
    <main>
      <PageHeader
        eyebrow="Ranking"
        title="오늘의 추천 순위"
        description="유동성, 검증 기록, 기술 흐름을 함께 반영해 오늘 우선 확인할 종목을 추린 순위입니다."
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>전체 스캔 대상</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{dailyCandidates?.totalTickers ?? 0}</p>
            <p className="mt-2 text-sm text-muted-foreground">오늘 유니버스에서 실제로 훑은 종목 수</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>오늘의 랭킹 수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{todayRanking.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">상위 추천 후보로 남긴 종목 수</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 갱신 시각</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">
              {dailyCandidates ? formatDateTimeShort(dailyCandidates.generatedAt) : "-"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">오늘 순위 데이터가 만들어진 시각</p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>오늘의 상위 100개</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-4">순위</th>
                  <th className="pb-3 pr-4">종목</th>
                  <th className="pb-3 pr-4">후보 점수</th>
                  <th className="pb-3 pr-4">기본 점수</th>
                  <th className="pb-3 pr-4">현재가</th>
                  <th className="pb-3 pr-4">20일 평균 거래대금</th>
                  <th className="pb-3 pr-4">유동성</th>
                  <th className="pb-3 pr-4">검증 표본</th>
                  <th className="pb-3 pr-4">평균 수익</th>
                  <th className="pb-3">상세</th>
                </tr>
              </thead>
              <tbody>
                {todayRanking.map((item) => (
                  <tr key={item.ticker} className="border-b border-border/60 text-foreground/84 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-foreground">#{item.rank}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">{item.company}</div>
                      <div className="text-xs text-muted-foreground">{item.ticker}</div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-foreground">{item.candidateScore}</td>
                    <td className="py-3 pr-4">{item.score}</td>
                    <td className="py-3 pr-4">{item.currentPrice ? formatPrice(item.currentPrice) : "-"}</td>
                    <td className="py-3 pr-4">{formatTurnover(item.averageTurnover20)}</td>
                    <td className="py-3 pr-4">{item.liquidityRating ?? "-"}</td>
                    <td className="py-3 pr-4">{item.recommendation?.validation.sampleSize ?? "-"}</td>
                    <td className="py-3 pr-4">
                      {item.recommendation ? formatPercent(item.recommendation.validation.avgReturn) : "-"}
                    </td>
                    <td className="py-3">
                      <Link className="text-primary hover:text-primary/80" href={`/analysis/${item.ticker}`}>
                        분석 보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>자주 등장한 종목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {historySummary.map((item) => (
              <div key={item.ticker} className="rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{item.company}</p>
                    <p className="text-xs text-muted-foreground">{item.ticker}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{item.appearances}회 등장</p>
                    <p>최고 {item.bestRank}위</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  최근 순위 {item.latestRank}위, 마지막 확인 {formatDateTimeShort(item.lastSeenAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
