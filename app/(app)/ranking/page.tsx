import Link from "next/link";

import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyCandidates, getDailyCandidatesHistory } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { formatDateTimeShort, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function buildRecurringSummary(history: Awaited<ReturnType<typeof getDailyCandidatesHistory>>) {
  const runs = history?.runs ?? [];
  const appearances = new Map<
    string,
    {
      ticker: string;
      company: string;
      count: number;
      bestRank: number;
      latestRank: number;
    }
  >();

  for (const run of runs) {
    for (const [index, item] of run.topCandidates.entries()) {
      const rank = index + 1;
      const current = appearances.get(item.ticker);

      if (!current) {
        appearances.set(item.ticker, {
          ticker: item.ticker,
          company: item.company,
          count: 1,
          bestRank: rank,
          latestRank: rank
        });
        continue;
      }

      current.count += 1;
      current.bestRank = Math.min(current.bestRank, rank);
      current.latestRank = rank;
    }
  }

  return [...appearances.values()]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      if (left.bestRank !== right.bestRank) {
        return left.bestRank - right.bestRank;
      }

      return left.ticker.localeCompare(right.ticker, "ko");
    })
    .slice(0, 8);
}

export default async function RankingPage() {
  const [recommendations, dailyCandidates, history] = await Promise.all([
    getRecommendations(),
    getDailyCandidates(),
    getDailyCandidatesHistory()
  ]);

  const recommendationMap = new Map(recommendations.items.map((item) => [item.ticker, item]));
  const topCandidates = (dailyCandidates?.topCandidates ?? []).slice(0, 10).map((item, index) => ({
    ...item,
    rank: index + 1,
    recommendation: recommendationMap.get(item.ticker)
  }));
  const recurringCandidates = buildRecurringSummary(history);
  const statusSummary = buildPublicDataStatusSummary(
    dailyCandidates ? "daily-candidates" : "recommendations",
    dailyCandidates?.generatedAt ?? recommendations.generatedAt
  );

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Explore"
        title="후보 탐색 보드"
        description="대시보드에 다 올리지 않은 종목까지 넓게 탐색하는 영역입니다. 오늘의 상위 후보와 반복 등장 후보를 보고, 필요할 때만 전체 탐색기로 깊게 들어갑니다."
      />
      <PublicDataStatusBar summary={statusSummary} />

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="오늘 스캔한 종목"
          value={`${dailyCandidates?.totalTickers ?? recommendations.items.length}개`}
          note="전일 데이터 기준으로 장전 후보를 추리는 전체 유니버스입니다."
        />
        <SummaryCard
          title="오늘 상위 후보"
          value={`${topCandidates.length}개`}
          note="이 중에서도 실제 행동은 장초 확인을 통과한 일부 종목만 남습니다."
        />
        <SummaryCard
          title="최근 갱신 시각"
          value={dailyCandidates ? formatDateTimeShort(dailyCandidates.generatedAt) : "-"}
          note="지금 보고 있는 탐색 데이터가 마지막으로 갱신된 시각입니다."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">오늘 먼저 볼 상위 후보</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              대시보드 밖에서 넓게 확인할 때 쓰는 목록입니다. 높은 순위가 바로 매수 의미는 아니며, 장초 확인과 포트폴리오 한도가
              함께 맞아야 실제 행동 보드로 올라갑니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCandidates.length ? (
              topCandidates.map((item) => (
                <Link
                  key={item.ticker}
                  href={`/analysis/${item.ticker}`}
                  className="block rounded-[24px] border border-border/70 bg-secondary/20 p-4 transition hover:border-primary/35 hover:bg-secondary/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          #{item.rank} {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                        </p>
                        {typeof item.recommendation?.featuredRank === "number" ? (
                          <Badge variant="secondary">추천 #{item.recommendation.featuredRank}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground/82">{item.rationale}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{item.candidateScore}</p>
                      <p className="mt-1 text-xs text-muted-foreground">후보 우선순위</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <MetricChip label="기본 점수" value={String(item.score)} />
                    <MetricChip
                      label="현재가"
                      value={typeof item.currentPrice === "number" ? formatPrice(item.currentPrice) : "확인 필요"}
                    />
                    <MetricChip label="유동성" value={item.liquidityRating ?? "확인 필요"} />
                    <MetricChip
                      label="관찰 점수"
                      value={typeof item.recommendation?.activationScore === "number" ? String(item.recommendation.activationScore) : "-"}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5 text-sm leading-6 text-muted-foreground">
                아직 탐색 후보가 생성되지 않았습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">반복 등장 후보</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              최근 여러 번 상위권에 등장했던 종목을 따로 보는 영역입니다. 반복 등장 자체가 매수 신호는 아니지만, 일회성 급등보다 차분한
              후보를 찾는 데 도움이 됩니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {recurringCandidates.length ? (
              recurringCandidates.map((item) => (
                <Link
                  key={item.ticker}
                  href={`/analysis/${item.ticker}`}
                  className="block rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-4 transition hover:border-primary/35 hover:bg-secondary/35"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.ticker}</p>
                    </div>
                    <Badge variant="secondary">{item.count}회</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <MetricChip label="최고 순위" value={`#${item.bestRank}`} />
                    <MetricChip label="최근 순위" value={`#${item.latestRank}`} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-5 text-sm leading-6 text-muted-foreground">
                아직 반복 등장 데이터를 만들기에 충분한 기록이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <RecommendationExplorer items={recommendations.items} />
      </section>
    </main>
  );
}

function SummaryCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

