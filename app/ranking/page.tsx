import Link from "next/link";
import { CheckCircle2, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyCandidates, getDailyCandidatesHistory } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { cn, formatDateTimeShort, formatPercent, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatTurnover(value?: number | null) {
  if (!value || value <= 0) {
    return "-";
  }

  const eok = value / 100_000_000;
  return `${eok.toFixed(eok >= 100 ? 0 : 1)}억`;
}

function buildHistorySummary(history: Awaited<ReturnType<typeof getDailyCandidatesHistory>>) {
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
    .slice(0, 12);
}

function getLiquidityTone(value?: string) {
  if (!value) {
    return "bg-secondary/60 text-muted-foreground";
  }
  if (value.includes("매우") || value.includes("풍부")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (value.includes("양호")) {
    return "bg-sky-100 text-sky-700";
  }
  if (value.includes("보통")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
}

function getLiquidityMeaning(value?: string) {
  if (!value) {
    return "거래대금 확인 필요";
  }
  if (value.includes("매우 풍부")) {
    return "거래대금 매우 풍부";
  }
  if (value.includes("풍부")) {
    return "거래대금 풍부";
  }
  if (value.includes("양호")) {
    return "거래대금 양호";
  }
  if (value.includes("보통")) {
    return "거래대금 보통";
  }
  if (value.includes("다소 약함")) {
    return "거래대금 다소 약함";
  }
  return "거래대금 부족";
}

function buildSignalBadges(item: {
  liquidityRating?: string;
  volumeRatio?: number | null;
  eventCoverage?: string;
}) {
  const badges = [
    {
      label: getLiquidityMeaning(item.liquidityRating),
      className: getLiquidityTone(item.liquidityRating)
    }
  ];

  if (typeof item.volumeRatio === "number" && Number.isFinite(item.volumeRatio)) {
    badges.push({
      label: item.volumeRatio >= 1.2 ? `거래량 증가 ${item.volumeRatio.toFixed(2)}배` : `거래량 안정 ${item.volumeRatio.toFixed(2)}배`,
      className:
        item.volumeRatio >= 1.2
          ? "border border-primary/20 bg-primary/12 text-primary"
          : "border border-border/70 bg-secondary/80 text-foreground/75"
    });
  }

  if (item.eventCoverage) {
    badges.push({
      label:
        item.eventCoverage === "보강됨"
          ? "이벤트 근거 보강"
          : item.eventCoverage === "제한적"
            ? "이벤트 근거 제한"
            : "이벤트 근거 취약",
      className: "border border-border/70 bg-secondary/80 text-foreground/75"
    });
  }

  return badges.slice(0, 3);
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
  const statusSummary = buildPublicDataStatusSummary(
    dailyCandidates ? "daily-candidates" : "recommendations",
    dailyCandidates?.generatedAt ?? recommendations.generatedAt
  );

  return (
    <main>
      <PageHeader
        eyebrow="Ranking"
        title="오늘의 추천 순위"
        description="추세, 거래대금, 상대 거래량, 검증 근거를 함께 반영해 오늘 먼저 볼 만한 종목을 정리한 순위입니다."
      />
      <PublicDataStatusBar summary={statusSummary} />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>전체 스캔 대상</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{dailyCandidates?.totalTickers ?? 0}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">오늘 유니버스에서 실제로 확인한 전체 종목 수입니다.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>오늘의 후보</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{todayRanking.length}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">상위 후보로 추린 종목 수입니다. 이 가운데 일부만 watchlist로 이어집니다.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 갱신 시각</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{dailyCandidates ? formatDateTimeShort(dailyCandidates.generatedAt) : "-"}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">오늘 순위 데이터가 마지막으로 정리된 시각입니다.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>이 순위를 보는 기준</CardTitle>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                이 순위는 급등주를 찾기보다, 추세가 이어지고 거래대금이 받쳐주며 과열은 덜한 흐름을 먼저 보이게 만드는 데 초점을 둡니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "거래대금이 충분하고 상대 거래량이 너무 약하지 않은 종목을 우선 봅니다.",
                "이동평균선, 추세 점수, RSI/MACD 흐름, 검증 근거를 함께 반영합니다.",
                "너무 낮은 가격대나 유동성이 과도하게 약한 종목은 순위에서 크게 불리합니다.",
                "자동 편입은 최근 한 달 안에서 반복적으로 상위권에 든 종목만 제한적으로 허용합니다."
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[22px] border border-border/70 bg-secondary/35 px-4 py-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-foreground/80">{item}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[22px] border border-border/70 bg-secondary/35 px-4 py-4">
              <p className="text-sm font-semibold text-foreground">후보 점수는 이렇게 읽습니다.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                기본 점수에 검증 적중률, 평균 수익, 표본 수, 거래대금, 거래량 흐름, 이벤트 커버리지를 더해 오늘 먼저 볼 만한 후보를 추립니다.
                즉 기본 점수만 높다고 바로 상위에 오르지 않고, 실제로 스윙 관점에서 확인할 만한지까지 함께 반영합니다.
              </p>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              오늘의 후보
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              시장 전체를 스캔한 뒤 오늘 먼저 볼 만한 후보를 점수순으로 정리한 표입니다. 실제 관찰 종목이나 자동 추적 종목은 이 후보 중 더 엄격한 기준을 통과한 일부만 이어집니다.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              랭킹 점수는 기본 신호 점수에 검증 품질, 유동성, 거래량 상태, 이벤트 커버리지를 더해 다시 정렬한 값입니다.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {todayRanking.length ? (
              <div className="min-w-[1100px]">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-border text-xs font-semibold tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="w-[64px] pb-3 pr-3">순위</th>
                      <th className="w-[180px] pb-3 pr-4">종목</th>
                      <th className="w-[96px] pb-3 pr-4">랭킹 점수</th>
                      <th className="w-[96px] pb-3 pr-4">기본 신호</th>
                      <th className="w-[104px] pb-3 pr-4">현재가</th>
                      <th className="w-[120px] pb-3 pr-4">20일 평균 거래대금</th>
                      <th className="w-[240px] pb-3 pr-4">후보 해석</th>
                      <th className="w-[84px] pb-3 pr-4">검증 표본</th>
                      <th className="w-[92px] pb-3 pr-4">평균 수익</th>
                      <th className="w-[96px] pb-3 text-right">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRanking.map((item) => {
                      const badges = buildSignalBadges(item);

                      return (
                        <tr key={item.ticker} className="border-b border-border/60 align-top text-foreground/84 last:border-0">
                          <td className="py-4 pr-3 font-semibold text-foreground">#{item.rank}</td>
                          <td className="py-4 pr-4">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">{item.company}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.ticker}</div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="font-medium text-foreground">{item.candidateScore}</div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="text-foreground/78">{item.score}</div>
                          </td>
                          <td className="py-4 pr-4 text-foreground/78">{item.currentPrice ? formatPrice(item.currentPrice) : "-"}</td>
                          <td className="py-4 pr-4 text-foreground/78">{formatTurnover(item.averageTurnover20)}</td>
                          <td className="py-4 pr-4">
                            <div className="flex flex-wrap gap-2">
                              {badges.map((badge) => (
                                <span
                                  key={`${item.ticker}-${badge.label}`}
                                  className={cn("rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", badge.className)}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-foreground/78">{item.recommendation?.validation.sampleSize ?? "-"}</td>
                          <td className="py-4 pr-4 text-foreground/78">
                            {item.recommendation ? formatPercent(item.recommendation.validation.avgReturn) : "-"}
                          </td>
                          <td className="py-4 text-right">
                            <Link
                              className="inline-flex rounded-full border border-primary/20 bg-primary/6 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary/10"
                              href={`/analysis/${item.ticker}`}
                            >
                              분석 보기
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/70 bg-secondary/20 px-6 py-10 text-center">
                <p className="text-lg font-semibold text-foreground">오늘 표시할 랭킹 후보가 아직 없습니다.</p>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  일일 유니버스 스캔 결과가 아직 생성되지 않았거나 후보 점수가 기준에 미치지 못했습니다. 먼저 추천 보드에서 현재 관찰 종목을
                  확인할 수 있습니다.
                </p>
                <div className="mt-5">
                  <Link
                    className="inline-flex rounded-full border border-primary/20 bg-primary/6 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                    href="/recommendations"
                  >
                    추천 보드 보기
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {historySummary.length ? (
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>자주 올라온 종목</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {historySummary.map((item) => (
                <div key={item.ticker} className="rounded-[24px] border border-border/70 bg-secondary/35 px-4 py-4">
                  <p className="font-semibold text-foreground">{item.company}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.ticker}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">등장</p>
                      <p className="mt-1 font-semibold text-foreground">{item.appearances}회</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">최고 순위</p>
                      <p className="mt-1 font-semibold text-foreground">#{item.bestRank}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">최근 순위</p>
                      <p className="mt-1 font-semibold text-foreground">#{item.latestRank}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
