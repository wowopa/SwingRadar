import { describe, expect, it } from "vitest";

import { buildAnalysisTradePlan } from "@/lib/analysis/action-plan";
import type { TickerAnalysis } from "@/types/analysis";

function createAnalysis(signalTone: TickerAnalysis["signalTone"] = "긍정"): TickerAnalysis {
  return {
    ticker: "005930",
    company: "삼성전자",
    signalTone,
    score: 82,
    activationScore: 72,
    headline: "확인 가격과 손절 기준이 비교적 분명한 자리입니다.",
    invalidation: "72,000원 아래로 내려가면 시나리오를 다시 봅니다.",
    analysisSummary: [
      { label: "현재 위치", value: "추세 회복", note: "중기 구조 회복 구간" },
      { label: "체크 포인트", value: "72,000원 지지", note: "기본 시나리오 유지 조건" },
      { label: "이벤트 민감도", value: "중간", note: "실적과 업황 뉴스 반응" }
    ],
    keyLevels: [
      { label: "손절", price: "72,000원", meaning: "구조 훼손 구간" },
      { label: "확인", price: "74,200원", meaning: "돌파 또는 재지지 확인" },
      { label: "목표", price: "76,500원", meaning: "1차 반응 구간" }
    ],
    technicalIndicators: {
      sma20: null,
      sma60: null,
      ema20: null,
      rsi14: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
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
    },
    chartSeries: [
      {
        label: "2026-03-30",
        close: 73_900,
        open: null,
        high: null,
        low: null,
        volume: null,
        sma20: null,
        sma60: null,
        ema20: null,
        bollingerUpper: null,
        bollingerLower: null,
        rsi14: null,
        macd: null,
        macdSignal: null
      }
    ],
    decisionNotes: ["추격보다 확인 가격 전후 반응이 중요합니다."],
    scoreBreakdown: [],
    scenarios: [],
    riskChecklist: [{ label: "이벤트 리스크", status: "확인 필요", note: "실적 발표 일정 확인" }],
    newsImpact: [],
    dataQuality: []
  };
}

describe("buildAnalysisTradePlan", () => {
  it("builds a buy-now plan when entry conditions are met", () => {
    const plan = buildAnalysisTradePlan({
      analysis: {
        ...createAnalysis(),
        trackingDiagnostic: {
          stage: "진입 추적 가능",
          activationScore: 72,
          watchThreshold: 52,
          entryThreshold: 68,
          isWatchEligible: true,
          isEntryEligible: true,
          blockers: [],
          supports: ["확인 가격 돌파", "거래량 동반"]
        }
      },
      dailyCandidate: {
        batch: 1,
        ticker: "005930",
        company: "삼성전자",
        sector: "반도체",
        signalTone: "긍정",
        score: 82,
        candidateScore: 86,
        activationScore: 72,
        currentPrice: 73_900,
        confirmationPrice: 74_200,
        expansionPrice: 76_500,
        invalidationPrice: 72_000,
        averageTurnover20: 5_000_000_000,
        liquidityRating: "양호",
        invalidation: "72,000원 하회 시 재검토",
        validationSummary: "과거 구조 참고",
        observationWindow: "5~15거래일",
        rationale: "돌파 이후 눌림 확인",
        eventCoverage: "보강됨"
      },
      featuredRank: 2
    });

    expect(plan.bucket).toBe("buy_now");
    expect(plan.entryLabel).toContain("73,900원");
    expect(plan.stopLabel).toBe("72,000원");
    expect(plan.targetLabel).toBe("76,500원");
    expect(plan.holdWindowLabel).toBe("5~15거래일");
  });

  it("falls back to watch-only when confirmation is still needed", () => {
    const plan = buildAnalysisTradePlan({
      analysis: {
        ...createAnalysis("중립"),
        activationScore: 55
      },
      featuredRank: 4
    });

    expect(plan.bucket).toBe("watch_only");
    expect(plan.entryLabel).toContain("74,200원");
    expect(plan.nextStep).toContain("74,200원");
  });
});
