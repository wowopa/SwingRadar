import { notFound } from "next/navigation";

import { AnalysisDecisionPanel } from "@/components/analysis/analysis-decision-panel";
import { AnalysisNavigation } from "@/components/analysis/analysis-navigation";
import { AnalysisSummaryBoard } from "@/components/analysis/analysis-summary-board";
import { DataQualityPanel } from "@/components/analysis/data-quality-panel";
import { EventCoveragePanel } from "@/components/analysis/event-coverage-panel";
import { NewsImpactList } from "@/components/analysis/news-impact-list";
import { RiskChecklist } from "@/components/analysis/risk-checklist";
import { ScenarioPanel } from "@/components/analysis/scenario-panel";
import { ScoreBreakdown } from "@/components/analysis/score-breakdown";
import { PageHeader } from "@/components/shared/page-header";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalysisByTicker } from "@/lib/repositories/analysis";
import { getAdjacentReadySymbols } from "@/lib/symbols/master";
import { formatScore } from "@/lib/utils";

export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const analysis = await getAnalysisByTicker(ticker);

  if (!analysis) {
    notFound();
  }

  const { previous, next, readyItems } = getAdjacentReadySymbols(ticker);

  return (
    <main>
      <PageHeader
        eyebrow="Analysis"
        title={`${analysis.company} ${analysis.ticker} 심화 분석`}
        description="신호 점수의 구성 요소, 시나리오, 무효화 조건, 리스크 체크리스트와 이벤트 커버리지를 한 화면에서 검토합니다."
      />
      <AnalysisNavigation
        currentTicker={analysis.ticker}
        previous={previous}
        next={next}
        readyItems={readyItems.map((item) => ({
          ticker: item.ticker,
          company: item.company,
          sector: item.sector
        }))}
      />
      <section className="mb-6">
        <AnalysisSummaryBoard items={analysis.analysisSummary} />
      </section>
      <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">현재 신호</p>
                <CardTitle className="mt-2 text-3xl text-foreground">{formatScore(analysis.score)}</CardTitle>
              </div>
              <SignalToneBadge tone={analysis.signalTone} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-base leading-7 text-foreground/82">{analysis.headline}</p>
            <div className="rounded-2xl border border-caution/20 bg-caution/8 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-caution">무효화 조건</p>
              <p className="mt-3 text-sm leading-6 text-foreground/78">{analysis.invalidation}</p>
            </div>
          </CardContent>
        </Card>
        <RiskChecklist items={analysis.riskChecklist} />
      </section>
      <section className="mb-6">
        <AnalysisDecisionPanel levels={analysis.keyLevels} notes={analysis.decisionNotes} />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <ScoreBreakdown items={analysis.scoreBreakdown} />
        <ScenarioPanel scenarios={analysis.scenarios} />
        <EventCoveragePanel items={analysis.newsImpact} />
        <DataQualityPanel items={analysis.dataQuality} />
        <div className="xl:col-span-2">
          <NewsImpactList items={analysis.newsImpact} />
        </div>
      </section>
    </main>
  );
}
