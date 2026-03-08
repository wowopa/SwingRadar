import type { Recommendation } from "@/types/recommendation";

export const recommendations: Recommendation[] = [
  {
    ticker: "005930",
    company: "삼성전자",
    sector: "반도체",
    signalTone: "긍정",
    score: 82,
    signalLabel: "돌파 후 눌림 감시",
    rationale:
      "거래대금 회복과 박스 상단 재돌파가 동반됐고, 최근 20거래일 내 눌림 이후 수급 재유입 패턴이 확인됩니다.",
    invalidation: "종가 기준 5일선 이탈이 2회 연속 발생하거나 외국인 순매수가 급감하면 관찰 신호를 해제합니다.",
    invalidationDistance: -4.1,
    riskRewardRatio: "1 : 2.3",
    validationSummary: "유사 구조 41건 기준, 눌림 이후 2주 내 재상승 케이스가 우세했습니다.",
    checkpoints: ["72,000원 지지 여부", "외국인 순매수 지속", "거래대금 20일 평균 상회"],
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
    rationale:
      "가격 회복력은 유지되지만 단기 모멘텀 지표가 과열 구간에 접근해 추격 관찰보다 재확인 구간으로 판단됩니다.",
    invalidation: "직전 돌파 구간 하단을 종가 기준으로 하회하면 시나리오를 중립 이하로 낮춥니다.",
    invalidationDistance: -3.2,
    riskRewardRatio: "1 : 1.6",
    validationSummary: "돌파 직후 추격보다는 재지지 확인 진입이 성과 편차를 줄였습니다.",
    checkpoints: ["거래량 유지", "박스 상단 재지지", "규제 뉴스 민감도 확인"],
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
    rationale:
      "반등 시도는 존재하지만 변동성 확장 대비 거래량 질이 약하고, 무효화 레벨과의 거리도 짧아 손익 비대칭이 불리합니다.",
    invalidation: "최근 저점 이탈 시 즉시 시나리오 폐기. 이벤트 변동성이 확대되면 추가 관찰도 중단합니다.",
    invalidationDistance: -1.8,
    riskRewardRatio: "1 : 0.9",
    validationSummary: "이벤트 기대형 반등은 재현성이 낮아 사후 추적 기준에서도 편차가 컸습니다.",
    checkpoints: ["최근 저점 방어", "이벤트 공시 확인", "섹터 약세 완화 여부"],
    validation: {
      hitRate: 38,
      avgReturn: -1.4,
      sampleSize: 22,
      maxDrawdown: -8.7
    },
    observationWindow: "1~7거래일",
    updatedAt: "2026-03-06 08:40"
  }
];