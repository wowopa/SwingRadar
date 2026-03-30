import type { TrackingResponseDto } from "@/lib/api-contracts/swing-radar";

export const trackingResponse: TrackingResponseDto = {
  generatedAt: "2026-03-07T01:00:00+09:00",
  history: [
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
  ],
  details: {
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
        { label: "이벤트 기여", value: "긍정 우세", note: "업황/공시 이벤트가 동행" },
        { label: "추격 억제", value: "양호", note: "과열 추격보다 눌림 확인이 우선되는 구조였습니다." }
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
        {
          timestamp: "2026-03-01 08:50",
          factor: "핵심 스윙 점수",
          delta: 33.5,
          reason: "추세, 수급, 품질, 변동성 점수를 함께 반영했습니다.",
          scoreAfter: 33.5
        },
        {
          timestamp: "2026-03-01 08:55",
          factor: "기술 구조",
          delta: 7.1,
          reason: "RSI, MACD, 거래량 구조가 모두 우호적이었습니다.",
          scoreAfter: 40.6
        },
        {
          timestamp: "2026-03-01 09:00",
          factor: "반복 등장",
          delta: 4.5,
          reason: "최근 상위 후보 반복 등장으로 일회성 급등 가능성을 낮췄습니다.",
          scoreAfter: 45.1
        },
        {
          timestamp: "2026-03-01 09:06",
          factor: "유동성",
          delta: 4,
          reason: "20일 평균 거래대금이 충분해 공용 추적 유동성 가산점을 받았습니다.",
          scoreAfter: 49.1
        },
        {
          timestamp: "2026-03-01 09:10",
          factor: "가격 구조",
          delta: 6,
          reason: "현재가가 무효화 가격 위에서 유지돼 구조 가산점을 반영했습니다.",
          scoreAfter: 55.1
        },
        {
          timestamp: "2026-03-01 09:14",
          factor: "추격 억제",
          delta: -1.8,
          reason: "단기 이격 경계가 일부 있었지만 반복 등장과 구조 유지로 추격 위험을 낮췄습니다.",
          scoreAfter: 53.3
        },
        {
          timestamp: "2026-03-01 09:18",
          factor: "최종 판정",
          delta: 0,
          reason: "활성화 점수 53.3점으로 자동 감시 기준을 넘었습니다.",
          scoreAfter: 53.3
        }
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
        { label: "이벤트 기여", value: "긍정", note: "AI narrative가 추세 유지에 기여" },
        { label: "추격 억제", value: "양호", note: "과열보다 박스 상단 재확인 이후 진입 구조였습니다." }
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
        { timestamp: "2026-02-20 08:50", factor: "핵심 스윙 점수", delta: 30.4, reason: "기본 스윙 점수를 반영했습니다.", scoreAfter: 30.4 },
        { timestamp: "2026-02-20 08:55", factor: "기술 구조", delta: 6.4, reason: "박스 상단 재돌파와 거래량 유지가 확인됐습니다.", scoreAfter: 36.8 },
        { timestamp: "2026-02-20 09:00", factor: "반복 등장", delta: 3, reason: "최근 상위 후보 반복 등장 이력을 반영했습니다.", scoreAfter: 39.8 },
        { timestamp: "2026-02-20 09:06", factor: "유동성", delta: 4, reason: "20일 평균 거래대금이 충분했습니다.", scoreAfter: 43.8 },
        { timestamp: "2026-02-20 09:10", factor: "가격 구조", delta: 6, reason: "현재가가 무효화 가격 위에서 안정적으로 유지됐습니다.", scoreAfter: 49.8 },
        { timestamp: "2026-02-20 09:14", factor: "추격 억제", delta: 0, reason: "단기 과열보다 눌림 확인형 재돌파 구조로 판단했습니다.", scoreAfter: 49.8 },
        { timestamp: "2026-02-20 09:18", factor: "최종 판정", delta: 0, reason: "활성화 점수 49.8점으로 자동 감시 후 진입 추적 후보가 됐습니다.", scoreAfter: 49.8 }
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
        { label: "이벤트 기여", value: "주의", note: "공시 이벤트는 있었지만 가격 반응 지속성 부족" },
        { label: "추격 억제", value: "경계", note: "초기 반등은 있었지만 추격 위험이 충분히 해소되지 않았습니다." }
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
        { timestamp: "2026-02-14 08:50", factor: "핵심 스윙 점수", delta: 24.8, reason: "기본 스윙 점수는 있었지만 품질 우위는 제한적이었습니다.", scoreAfter: 24.8 },
        { timestamp: "2026-02-14 08:55", factor: "기술 구조", delta: 3.2, reason: "초기 반등 시도는 있었지만 추세 복원은 약했습니다.", scoreAfter: 28 },
        { timestamp: "2026-02-14 09:00", factor: "반복 등장", delta: 1.5, reason: "반복 등장 이력이 짧아 가산 폭이 크지 않았습니다.", scoreAfter: 29.5 },
        { timestamp: "2026-02-14 09:10", factor: "가격 구조", delta: -8, reason: "무효화 가격과의 거리가 짧아 구조 점수를 크게 깎았습니다.", scoreAfter: 21.5 },
        { timestamp: "2026-02-14 09:14", factor: "추격 억제", delta: -4.5, reason: "이벤트 직후 변동성과 이격이 커 단기 급등 추격 위험을 경계했습니다.", scoreAfter: 17 },
        { timestamp: "2026-02-14 09:18", factor: "최종 판정", delta: 0, reason: "활성화 점수가 낮고 추격 위험이 남아 보수적으로 봤습니다.", scoreAfter: 17 }
      ]
    }
  }
};
