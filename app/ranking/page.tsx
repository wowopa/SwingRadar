import Link from "next/link";
import { CheckCircle2, Sparkles, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyCandidates, getDailyCandidatesHistory } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { cn, formatDateTimeShort, formatPercent, formatPrice } from "@/lib/utils";

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
    .slice(0, 30);
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

function buildSignalBadges(item: {
  liquidityRating?: string;
  volumeRatio?: number | null;
  eventCoverage?: string;
}) {
  const badges = [
    {
      label: item.liquidityRating ?? "유동성 미확인",
      className: getLiquidityTone(item.liquidityRating)
    }
  ];

  if (typeof item.volumeRatio === "number" && Number.isFinite(item.volumeRatio)) {
    badges.push({
      label: item.volumeRatio >= 1.2 ? `거래 증가 ${item.volumeRatio.toFixed(2)}배` : `거래 안정 ${item.volumeRatio.toFixed(2)}배`,
      className: item.volumeRatio >= 1.2 ? "bg-primary/12 text-primary" : "bg-secondary/80 text-foreground/75"
    });
  }

  if (item.eventCoverage) {
    badges.push({
      label: item.eventCoverage,
      className: "bg-secondary/80 text-foreground/75"
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

  return (
    <main>
      <PageHeader
        eyebrow="Ranking"
        title="오늘의 추천 순위"
        description="추세, 거래대금, 상대 거래량, 검증 근거를 함께 반영해 오늘 더 먼저 볼 만한 종목을 정리한 순위입니다."
      />

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
            <CardTitle>오늘의 상위 후보</CardTitle>
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
                이 순위는 단기 급등주를 찾기보다, 추세가 살아 있고 거래대금이 받쳐주며 과열이 심하지 않은 스윙 후보를
                먼저 보여주는 데 초점을 둡니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "거래대금이 충분하고 상대 거래량이 너무 약하지 않은 종목을 우선 봅니다.",
                "이동평균선 위 추세, RSI/MACD 흐름, 검증 근거를 함께 반영합니다.",
                "너무 낮은 가격대와 유동성이 약한 종목은 순위에서 강하게 불리합니다.",
                "자동 편입은 최근 한 달 안에서 반복적으로 상위권에 든 종목만 제한적으로 허용합니다."
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[22px] border border-border/70 bg-secondary/35 px-4 py-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-foreground/80">{item}</p>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              오늘의 상위 100개
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[1100px]">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border text-xs font-semibold tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="w-[64px] pb-3 pr-3">순위</th>
                    <th className="w-[180px] pb-3 pr-4">종목</th>
                    <th className="w-[88px] pb-3 pr-4">후보 점수</th>
                    <th className="w-[88px] pb-3 pr-4">기본 점수</th>
                    <th className="w-[104px] pb-3 pr-4">현재가</th>
                    <th className="w-[120px] pb-3 pr-4">20일 평균 거래대금</th>
                    <th className="w-[216px] pb-3 pr-4">신호 요약</th>
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
                        <td className="py-4 pr-4 font-medium text-foreground">{item.candidateScore}</td>
                        <td className="py-4 pr-4 text-foreground/78">{item.score}</td>
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
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              자주 올라온 종목
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {historySummary.slice(0, 12).map((item) => (
              <div key={item.ticker} className="rounded-[22px] border border-border/70 bg-secondary/30 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.company}</p>
                    <p className="text-xs text-muted-foreground">{item.ticker}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm text-muted-foreground">
                    <p>{item.appearances}회</p>
                    <p>최고 {item.bestRank}위</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  최근 순위 {item.latestRank}위, 마지막 포착 {formatDateTimeShort(item.lastSeenAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
