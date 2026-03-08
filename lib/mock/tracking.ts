import type { SignalHistoryEntry, TrackingDetail } from "@/types/tracking";

export const signalHistory: SignalHistoryEntry[] = [
  {
    id: "hist-005930-20260301",
    ticker: "005930",
    company: "삼성전자",
    signalDate: "2026-03-01",
    signalTone: "긍정",
    entryScore: 79,
    result: "진행중",
    mfe: 4.8,
    mae: -1.9,
    holdingDays: 5
  },
  {
    id: "hist-035420-20260220",
    ticker: "035420",
    company: "NAVER",
    signalDate: "2026-02-20",
    signalTone: "중립",
    entryScore: 66,
    result: "성공",
    mfe: 7.2,
    mae: -2.4,
    holdingDays: 11
  },
  {
    id: "hist-068270-20260214",
    ticker: "068270",
    company: "셀트리온",
    signalDate: "2026-02-14",
    signalTone: "주의",
    entryScore: 48,
    result: "무효화",
    mfe: 1.3,
    mae: -6.8,
    holdingDays: 4
  }
];

export const trackingDetails: Record<string, TrackingDetail> = {
  "hist-005930-20260301": {
    historyId: "hist-005930-20260301",
    summary: "초기 돌파 이후 눌림이 제한적으로 발생했고, 무효화 가격은 아직 지켜지고 있습니다.",
    invalidationReview: "무효화 가격과 현재가의 괴리는 아직 관리 가능한 수준입니다.",
    afterActionReview: "과열 추격보다 눌림 이후 확인에 집중한 접근이 유효했습니다.",
    reviewChecklist: [
      "초기 진입 근거였던 거래대금 회복이 유지되는지 확인",
      "무효화 구간 근처에서 종가 방어가 계속되는지 확인",
      "과열 이후에도 점수 로그가 유지되는지 추적"
    ],
    metrics: [
      { label: "사후 평가", value: "유효 진행중", note: "무효화 미도달" },
      { label: "기대값 평가", value: "양호", note: "MFE가 MAE보다 우위" },
      { label: "이벤트 기여", value: "긍정 우세", note: "업황/공시 이벤트가 동행" }
    ],
    chartSnapshot: [
      { label: "D1", price: 70600 },
      { label: "D2", price: 71800 },
      { label: "D3", price: 71300 },
      { label: "D4", price: 72600 },
      { label: "D5", price: 73100 }
    ],
    historicalNews: [
      {
        id: "hist-005930-news-1",
        date: "2026-03-02",
        headline: "메모리 업황 개선 기대 확산",
        impact: "긍정",
        note: "실적 추정 상향 기대가 거래대금 회복에 기여했습니다.",
        source: "naver-search",
        url: "https://example.com/005930-news-1",
        eventType: "news"
      },
      {
        id: "hist-005930-disclosure-1",
        date: "2026-03-03",
        headline: "[공시] 자기주식 취득 결정",
        impact: "긍정",
        note: "자사주 이벤트는 하방 심리 방어에 우호적이었습니다.",
        source: "dart",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260303000123",
        eventType: "disclosure"
      }
    ],
    scoreLog: [
      { timestamp: "2026-03-01 09:10", factor: "거래대금", delta: 6, reason: "20일 평균 대비 1.7배 증가" },
      { timestamp: "2026-03-03 15:20", factor: "눌림 방어", delta: 3, reason: "지지 구간 종가 방어 확인" },
      { timestamp: "2026-03-05 10:40", factor: "과열 경고", delta: -2, reason: "단기 RSI 과열 진입" }
    ]
  },
  "hist-035420-20260220": {
    historyId: "hist-035420-20260220",
    summary: "박스 상단 재확인 이후 거래량 유지가 확인되며 기본 시나리오를 충족했습니다.",
    invalidationReview: "중간 눌림은 있었지만 무효화 구간 이탈은 없었습니다.",
    afterActionReview: "추격보다 지지 확인 위주의 접근이 유효했던 사례입니다.",
    reviewChecklist: [
      "상단 돌파 후 거래량이 유지됐는지 확인",
      "눌림 구간 이후 재상승 시도가 있었는지 확인",
      "이벤트가 점수 상향으로 실제 연결됐는지 복기"
    ],
    metrics: [
      { label: "사후 평가", value: "성공", note: "기본 시나리오 충족" },
      { label: "기대값 평가", value: "우세", note: "MFE/MAE 비율 우호적" },
      { label: "이벤트 기여", value: "긍정", note: "AI narrative가 추세 유지에 기여" }
    ],
    chartSnapshot: [
      { label: "D1", price: 194000 },
      { label: "D4", price: 199500 },
      { label: "D7", price: 205000 },
      { label: "D9", price: 207500 },
      { label: "D11", price: 206800 }
    ],
    historicalNews: [
      {
        id: "hist-035420-news-1",
        date: "2026-02-22",
        headline: "클라우드와 AI 투자 확대 계획",
        impact: "긍정",
        note: "운영자 큐레이션 이슈가 추세 유지에 우호적이었습니다.",
        source: "manual",
        url: "https://example.com/035420-news-1",
        eventType: "curated-news"
      }
    ],
    scoreLog: [
      { timestamp: "2026-02-20 09:05", factor: "추세 전환", delta: 5, reason: "박스 상단 재돌파" },
      { timestamp: "2026-02-25 13:15", factor: "거래량 유지", delta: 4, reason: "상단 안착 이후 거래량 유지" }
    ]
  },
  "hist-068270-20260214": {
    historyId: "hist-068270-20260214",
    summary: "초기 반등은 있었지만 무효화 구간과의 거리가 짧아 기대값이 약했습니다.",
    invalidationReview: "165,000원 하회로 관찰 시나리오를 종료했습니다.",
    afterActionReview: "이벤트가 있어도 가격 방어가 부족하면 신호는 유지되지 않는 사례였습니다.",
    reviewChecklist: [
      "무효화 거리 대비 기대값이 충분했는지 재평가",
      "공시 이벤트가 실제 거래량 증가로 이어졌는지 확인",
      "섹터 약세가 개별 신호보다 강했는지 복기"
    ],
    metrics: [
      { label: "사후 평가", value: "무효화", note: "저점 하향 이탈" },
      { label: "기대값 평가", value: "불리", note: "MAE가 MFE보다 우세" },
      { label: "이벤트 기여", value: "주의", note: "공시 이벤트는 있었지만 가격 반응 지속성 부족" }
    ],
    chartSnapshot: [
      { label: "D1", price: 171000 },
      { label: "D2", price: 173500 },
      { label: "D3", price: 169200 },
      { label: "D4", price: 165800 }
    ],
    historicalNews: [
      {
        id: "hist-068270-disclosure-1",
        date: "2026-02-15",
        headline: "[공시] 스텔라라 시밀러 3상 결과 공시",
        impact: "긍정",
        note: "공시 자체는 우호적이었지만 가격 지속성은 부족했습니다.",
        source: "dart",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260215000111",
        eventType: "disclosure"
      },
      {
        id: "hist-068270-news-1",
        date: "2026-02-16",
        headline: "자사주 911만주 소각 추진",
        impact: "긍정",
        note: "주주환원 이슈는 있었지만 하락 추세를 뒤집기엔 부족했습니다.",
        source: "naver-search",
        url: "https://example.com/068270-news-1",
        eventType: "news"
      }
    ],
    scoreLog: [
      { timestamp: "2026-02-14 09:12", factor: "이벤트 기대감", delta: 2, reason: "초기 반등 시도" },
      { timestamp: "2026-02-17 14:00", factor: "저점 이탈", delta: -8, reason: "무효화 조건 충족" }
    ]
  }
};
