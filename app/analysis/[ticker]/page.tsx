import { notFound, redirect } from "next/navigation";

import { AnalysisDecisionPanel } from "@/components/analysis/analysis-decision-panel";
import { AnalysisNavigation } from "@/components/analysis/analysis-navigation";
import { DataQualityPanel } from "@/components/analysis/data-quality-panel";
import { HistoricalValidationPanel } from "@/components/analysis/historical-validation-panel";
import { RiskChecklist } from "@/components/analysis/risk-checklist";
import { ScenarioPanel } from "@/components/analysis/scenario-panel";
import { ScoreBreakdown } from "@/components/analysis/score-breakdown";
import { TrackingDiagnosticPanel } from "@/components/analysis/tracking-diagnostic-panel";
import { TradingViewChartCard } from "@/components/analysis/tradingview-chart-card";
import { GoogleNewsSearchCard } from "@/components/shared/google-news-search-card";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataQualityItem, RiskChecklistItem, TickerAnalysis } from "@/types/analysis";
import { getAnalysisByTicker } from "@/lib/repositories/analysis";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { getCompanyOverviewLines } from "@/lib/server/company-overview";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { buildTradingViewSymbol, getReadySymbols, getSymbolByTicker, resolveTicker } from "@/lib/symbols/master";
import { describeSignalScore, formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EMPTY_TECHNICAL_INDICATORS = {
  sma20: null,
  sma60: null,
  ema20: null,
  macd: null,
  macdSignal: null,
  macdHistogram: null,
  rsi14: null,
  bollingerUpper: null,
  bollingerMiddle: null,
  bollingerLower: null,
  volumeRatio20: null,
  atr14: null,
  natr14: null,
  adx14: null,
  plusDi14: null,
  minusDi14: null,
  stochasticK: null,
  stochasticD: null,
  mfi14: null,
  roc20: null,
  cci20: null,
  cmf20: null,
  marketRelativeStrength20: null,
  marketRelativeSpread20: null
} as const;

const EMPTY_CHART_SERIES = [] as const;

function pickActionTitle(signalTone: TickerAnalysis["signalTone"]) {
  if (signalTone === "긍정") {
    return "지금은 우선 관찰하고 눌림 기회를 볼 만한 후보입니다.";
  }
  if (signalTone === "주의") {
    return "좋아 보이는 부분은 있지만 진입 전 확인이 더 필요한 후보입니다.";
  }
  return "바로 추격하기보다 조건을 더 확인하며 지켜볼 만한 후보입니다.";
}

function buildTopReasons(analysis: TickerAnalysis) {
  return analysis.analysisSummary.slice(0, 3).map((item) => `${item.label}: ${item.value} (${item.note})`);
}

function buildWatchouts(notes: string[], riskChecklist: RiskChecklistItem[]) {
  const warnings = riskChecklist.filter((item) => item.status !== "양호");

  if (warnings.length) {
    return warnings.slice(0, 3).map((item) => `${item.label}: ${item.note}`);
  }

  return notes.slice(0, 2);
}

function getHistoricalRead(dataQuality: DataQualityItem[]) {
  return (
    dataQuality.find((item) => item.label === "검증")?.note ??
    "히스토리 검증 메모가 아직 충분히 쌓이지 않아 기본 검증 기준으로 읽고 있습니다."
  );
}

function getMethodRead() {
  return "이 분석은 뉴스보다 가격 구조, 거래량 흐름, 과거 검증, 보조지표 정합성을 중심으로 읽습니다. 리스크 체크리스트와 차트의 진입 기준 / 목표 가격 / 위험 가격을 함께 확인해 주세요.";
}

function buildFallbackOverview({
  company,
  ticker,
  market,
  region,
  status
}: {
  company: string;
  ticker: string;
  market: string;
  region: string;
  status: "ready" | "pending";
}) {
  const regionLabel = region === "KR" ? "국내" : "해외";
  const statusLabel =
    status === "ready"
      ? "현재 SwingRadar 분석 데이터는 바로 확인할 수 있습니다."
      : "아직 분석 데이터 준비 중인 종목입니다.";

  return [
    `${company} (${ticker})은 ${market}에 상장된 ${regionLabel} 기업입니다.`,
    `현재 프로젝트에서 확인되는 분석 상태는 다음과 같습니다. ${statusLabel}`
  ];
}

export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const resolvedTicker = resolveTicker(ticker);

  if (resolvedTicker !== ticker) {
    redirect(`/analysis/${resolvedTicker}`);
  }

  const analysisPayload = await getAnalysisByTicker(resolvedTicker);
  const dailyCandidates = await getDailyCandidates().catch(() => null);
  const trackingPayload = await getTrackingPayload().catch(() => null);

  if (!analysisPayload) {
    notFound();
  }

  const analysis = analysisPayload.item;
  const statusSummary = buildPublicDataStatusSummary("analysis", analysisPayload.generatedAt);
  const readyItems = getReadySymbols();
  const symbol = getSymbolByTicker(resolvedTicker);
  const tradingViewSymbol = symbol ? buildTradingViewSymbol(symbol.ticker, symbol.market) : null;
  const visibleRiskChecklist = analysis.riskChecklist.filter((item) => item.label !== "이벤트 리스크");
  const topReasons = buildTopReasons(analysis);
  const watchouts = buildWatchouts(analysis.decisionNotes, visibleRiskChecklist);
  const historicalRead = getHistoricalRead(analysis.dataQuality);
  const methodRead = getMethodRead();
  const signalScoreLabel = describeSignalScore(analysis.score);
  const featuredRank = dailyCandidates?.topCandidates.findIndex((item) => item.ticker === resolvedTicker);
  const featuredCandidate =
    typeof featuredRank === "number" && featuredRank >= 0 ? dailyCandidates?.topCandidates[featuredRank] : undefined;
  const historicalItems =
    trackingPayload?.history
      .filter((item) => resolveTicker(item.ticker) === resolvedTicker)
      .sort((left, right) => right.signalDate.localeCompare(left.signalDate)) ?? [];
  const historicalDetails = Object.fromEntries(
    historicalItems
      .map((item) => [item.id, trackingPayload?.details[item.id]])
      .filter(
        (entry): entry is [string, NonNullable<typeof trackingPayload>["details"][string]] => Boolean(entry[1])
      )
  );
  const headerTitle =
    typeof featuredRank === "number" && featuredRank >= 0
      ? `${analysis.company} (${analysis.ticker}) - 오늘 후보 #${featuredRank + 1}`
      : `${analysis.company} (${analysis.ticker})`;
  const fetchedOverviewLines = (await getCompanyOverviewLines(analysis.ticker)).slice(0, 3);
  const overview = {
    company: analysis.company,
    ticker: analysis.ticker,
    market: symbol?.market ?? "KRX",
    region: symbol?.region ?? "KR",
    status: symbol?.status ?? "ready",
    summaryLines: fetchedOverviewLines.length
      ? fetchedOverviewLines
      : buildFallbackOverview({
          company: analysis.company,
          ticker: analysis.ticker,
          market: symbol?.market ?? "KRX",
          region: symbol?.region ?? "KR",
          status: symbol?.status ?? "ready"
        })
  };

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title={headerTitle}
        description="지금 관찰 포인트를 무엇으로 보고, 무엇을 경계해야 하는지 가격 구조와 검증 이력 중심으로 정리한 화면입니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <AnalysisNavigation
        currentTicker={analysis.ticker}
        readyItems={readyItems.map((item) => ({
          ticker: item.ticker,
          company: item.company,
          sector: item.sector
        }))}
        overview={overview}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader className="gap-5 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">현재 판단</p>
                <CardTitle className="mt-2 text-3xl text-foreground sm:text-[2.2rem]">{signalScoreLabel}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">기본 신호 {formatScore(analysis.score)} / 100점</p>
              </div>
              <SignalToneBadge tone={analysis.signalTone} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3">
                <p className="text-xs text-muted-foreground">기본 신호</p>
                <p className="mt-1 text-base font-semibold text-foreground">{formatScore(analysis.score)}점</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3">
                <p className="text-xs text-muted-foreground">랭킹 점수</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {typeof featuredCandidate?.candidateScore === "number" ? `${formatScore(featuredCandidate.candidateScore)}점` : "후보 외"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3">
                <p className="text-xs text-muted-foreground">활성화 점수</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {typeof analysis.activationScore === "number" ? `${formatScore(analysis.activationScore)}점` : "계산 중"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg font-semibold text-foreground">{pickActionTitle(analysis.signalTone)}</p>
              <p className="mt-3 max-w-3xl text-base leading-8 text-foreground/82">{analysis.headline}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-border/70 bg-secondary/25 p-5">
                <p className="text-sm font-semibold text-foreground">왜 지금 보는가</p>
                <div className="mt-3 space-y-2">
                  {topReasons.map((reason) => (
                    <p key={reason} className="text-sm leading-7 text-foreground/80">
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-[28px] border border-border/70 bg-secondary/25 p-5">
                <p className="text-sm font-semibold text-foreground">무엇을 조심할까</p>
                <div className="mt-3 space-y-2">
                  {watchouts.map((item) => (
                    <p key={item} className="text-sm leading-7 text-foreground/78">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-caution/20 bg-caution/8 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-caution">기준 이탈</p>
              <p className="mt-3 text-sm leading-7 text-foreground/78">{analysis.invalidation}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <RiskChecklist items={visibleRiskChecklist} />
          <TrackingDiagnosticPanel diagnostic={analysis.trackingDiagnostic} />
          <Card>
            <CardHeader>
              <CardTitle>과거 검증 해석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-foreground/80">{historicalRead}</p>
              <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4 text-sm leading-7 text-muted-foreground">
                {methodRead}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <ScoreBreakdown items={analysis.scoreBreakdown} />
      </section>

      <HistoricalValidationPanel
        history={historicalItems}
        details={historicalDetails}
        validation={analysis.validation}
        validationBasis={analysis.validationBasis}
        insight={analysis.validationInsight}
      />

      <TradingViewChartCard
        company={analysis.company}
        symbol={tradingViewSymbol}
        points={analysis.chartSeries ?? EMPTY_CHART_SERIES}
        indicators={analysis.technicalIndicators ?? EMPTY_TECHNICAL_INDICATORS}
        levels={analysis.keyLevels}
        snapshotGeneratedAt={analysisPayload.generatedAt}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AnalysisDecisionPanel notes={analysis.decisionNotes} />
        <ScenarioPanel scenarios={analysis.scenarios} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
        <DataQualityPanel items={analysis.dataQuality} />
        <GoogleNewsSearchCard
          company={analysis.company}
          ticker={analysis.ticker}
          description="서비스 안에서 뉴스를 직접 점수화해 보여주기보다, 필요할 때 바로 관련 기사 흐름을 확인할 수 있도록 외부 뉴스 검색으로 연결합니다."
        />
      </section>
    </main>
  );
}
