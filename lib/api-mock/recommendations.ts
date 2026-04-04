import type { RecommendationsResponseDto } from "@/lib/api-contracts/swing-radar";

export const recommendationsResponse: RecommendationsResponseDto = {
  generatedAt: "2026-03-07T01:00:00+09:00",
  dailyScan: null,
  marketSession: {
    marketDate: "2026-03-07",
    isOpenDay: true,
    closureKind: "open",
    closureLabel: "개장일",
    headline: "오늘 장초 확인을 마친 뒤 실제 행동으로 이어가세요.",
    detail: "장초 확인 뒤 실제 행동으로 이어집니다."
  },
  items: [
    {
      ticker: "005930",
      company: "삼성전자",
      sector: "반도체",
      signalTone: "긍정",
      score: 82,
      signalLabel: "돌파 이후 눌림 관찰",
      rationale: "거래대금이 유지된 상태에서 돌파 후 첫 눌림이 나왔고, 단기 지지 구간이 아직 유지되고 있습니다.",
      invalidation: "5일선 이탈이 2거래일 연속 발생하면 관찰 신호를 해제합니다.",
      invalidationDistance: -4.1,
      riskRewardRatio: "1 : 2.3",
      validationSummary: "유사 구조 41건 기준으로 눌림 이후 2주 내 반등 사례가 우세했습니다.",
      checkpoints: ["72,000원 지지 유지", "외국인 수급 유지", "거래대금 20일 평균 상회"],
      validation: {
        hitRate: 63,
        avgReturn: 5.8,
        sampleSize: 41,
        maxDrawdown: -4.2
      },
      observationWindow: "5~15거래일",
      updatedAt: "2026-03-06 08:40"
    },
    {
      ticker: "035420",
      company: "NAVER",
      sector: "인터넷",
      signalTone: "중립",
      score: 68,
      signalLabel: "상단 매물 소화 확인",
      rationale: "가격 회복은 있었지만 단기 모멘텀이 강하지 않아 상단 매물 소화 여부를 더 확인할 필요가 있습니다.",
      invalidation: "직전 돌파 구간 하단 아래로 종가 기준 재이탈하면 시나리오를 중립 이하로 낮춥니다.",
      invalidationDistance: -3.2,
      riskRewardRatio: "1 : 1.6",
      validationSummary: "돌파 직후 추격보다 재지지 확인 진입이 더 안정적인 결과를 보였습니다.",
      checkpoints: ["거래량 유지", "박스 상단 재지지", "규제 이슈 민감도 확인"],
      validation: {
        hitRate: 54,
        avgReturn: 3.1,
        sampleSize: 29,
        maxDrawdown: -5.5
      },
      observationWindow: "3~10거래일",
      updatedAt: "2026-03-06 08:40"
    },
    {
      ticker: "068270",
      company: "셀트리온",
      sector: "제약/바이오",
      signalTone: "주의",
      score: 44,
      signalLabel: "반등 시도 대비 경계",
      rationale: "반등 시도는 있으나 변동성 대비 거래 질이 약하고, 무효화 구간과의 거리가 짧습니다.",
      invalidation: "최근 저점 이탈 시 즉시 시나리오를 폐기하고 추가 관찰도 중단합니다.",
      invalidationDistance: -1.8,
      riskRewardRatio: "1 : 0.9",
      validationSummary: "이벤트 기대형 반등은 사후 추적 기준에서 손익 편차가 컸습니다.",
      checkpoints: ["최근 저점 방어", "이벤트 공시 확인", "섹터 추세 회복 여부"],
      validation: {
        hitRate: 38,
        avgReturn: -1.4,
        sampleSize: 22,
        maxDrawdown: -8.7
      },
      observationWindow: "1~7거래일",
      updatedAt: "2026-03-06 08:40"
    }
  ]
};
