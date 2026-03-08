import type { AnalysisResponseDto } from "@/lib/api-contracts/swing-radar";

export const analysisResponse: AnalysisResponseDto = {
  generatedAt: "2026-03-07T01:00:00+09:00",
  items: [
    {
      ticker: "005930",
      company: "삼성전자",
      signalTone: "긍정",
      score: 82,
      headline: "추세 복원 관찰 신호가 유지되고 있으며, 과열보다 눌림 이후의 재확인이 더 중요합니다.",
      invalidation: "72,000원 하회 시 현재 관찰 가설을 무효화합니다.",
      analysisSummary: [
        { label: "현재 해석", value: "회복 추세", note: "중기 구조 복원 구간" },
        { label: "우선 체크", value: "72,000원 지지", note: "기본 시나리오 유지 조건" },
        { label: "이벤트 감도", value: "중간", note: "실적과 업황 뉴스에 민감" },
        { label: "데이터 품질", value: "양호", note: "가격과 뉴스 정합성 확보" }
      ],
      keyLevels: [
        { label: "무효화", price: "72,000원", meaning: "관찰 가설 재평가 구간" },
        { label: "확인", price: "74,200원", meaning: "돌파 지속 여부 확인" },
        { label: "확장", price: "76,500원", meaning: "강세 시나리오 전환 확인" }
      ],
      decisionNotes: [
        "과열 추격보다 눌림 이후의 거래대금 회복 여부를 먼저 봅니다.",
        "무효화 거리는 짧지 않지만, 업황 이벤트 동반 여부를 같이 확인합니다.",
        "기본 시나리오에서는 확인 구간 안착 여부가 핵심입니다."
      ],
      scoreBreakdown: [
        { label: "추세 구조", score: 23, description: "중기 추세 복원 흐름" },
        { label: "수급", score: 21, description: "거래대금과 회전율 개선" },
        { label: "변동성", score: 14, description: "무효화 거리 관리 가능" },
        { label: "이벤트", score: 12, description: "업황 기대와 단기 뉴스 반영" },
        { label: "품질", score: 12, description: "시장 데이터와 이벤트 정합성" }
      ],
      scenarios: [
        { label: "기본", probability: 55, expectation: "확인 구간 안착", trigger: "72,000원 지지 유지" },
        { label: "강세", probability: 25, expectation: "상단 확장 시도", trigger: "74,200원 돌파 후 거래량 확대" },
        { label: "약세", probability: 20, expectation: "무효화 구간 재접근", trigger: "지지 이탈" }
      ],
      riskChecklist: [
        { label: "무효화 거리", status: "양호", note: "현재가 대비 관리 가능 구간" },
        { label: "이벤트 리스크", status: "확인 필요", note: "업황 민감도가 높습니다." },
        { label: "과열 여부", status: "주의", note: "단기 과열 신호는 일부 남아 있습니다." }
      ],
      newsImpact: [
        {
          headline: "메모리 업황 개선 기대 재부각",
          impact: "긍정",
          summary: "실적 추정 상향 기대가 신호 지속에 우호적입니다.",
          source: "naver-search",
          url: "https://example.com/005930-news-1",
          date: "2026-03-07",
          eventType: "news"
        },
        {
          headline: "[공시] 자기주식 취득 결정",
          impact: "긍정",
          summary: "자사주 정책은 하방 방어 심리에 우호적입니다.",
          source: "dart",
          url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260307000123",
          date: "2026-03-07",
          eventType: "disclosure"
        }
      ],
      dataQuality: [
        { label: "시세", value: "정상", note: "가격 스냅샷 최신" },
        { label: "뉴스", value: "2건", note: "공시 1건 포함" },
        { label: "품질", value: "양호", note: "외부 이벤트와 가격 흐름 정합" }
      ]
    },
    {
      ticker: "035420",
      company: "NAVER",
      signalTone: "중립",
      score: 68,
      headline: "박스 상단 재확인 구간으로, 추격보다 지지 확인이 먼저입니다.",
      invalidation: "198,000원 하회 시 현재 관찰 신호를 재평가합니다.",
      analysisSummary: [
        { label: "현재 해석", value: "확인 구간", note: "추세 전환 확인 필요" },
        { label: "우선 체크", value: "거래량 확인", note: "상단 안착 여부 중요" },
        { label: "이벤트 감도", value: "높음", note: "플랫폼/AI 뉴스 민감" },
        { label: "데이터 품질", value: "보통", note: "국내 기사 coverage 보강 필요" }
      ],
      keyLevels: [
        { label: "무효화", price: "198,000원", meaning: "관찰 구간 종료" },
        { label: "확인", price: "203,500원", meaning: "상단 안착 여부 확인" },
        { label: "확장", price: "208,000원", meaning: "강세 시나리오 전환 확인" }
      ],
      decisionNotes: [
        "상단 돌파보다 거래량 유지 여부를 먼저 봅니다.",
        "AI/플랫폼 모멘텀은 우호적이지만 규제 변수는 남아 있습니다.",
        "현 구간은 추격보다 관찰 우선입니다."
      ],
      scoreBreakdown: [
        { label: "추세 구조", score: 20, description: "박스 상단 재접근" },
        { label: "수급", score: 16, description: "기관 수급 회복 조짐" },
        { label: "변동성", score: 11, description: "상단 매물 소화 확인 필요" },
        { label: "이벤트", score: 10, description: "AI 기대와 규제 변수 공존" },
        { label: "품질", score: 11, description: "coverage는 아직 보통" }
      ],
      scenarios: [
        { label: "기본", probability: 50, expectation: "상단 재확인", trigger: "거래량 유지" },
        { label: "강세", probability: 20, expectation: "강세 전환 시도", trigger: "AI 모멘텀 강화" },
        { label: "약세", probability: 30, expectation: "지지 구간 재테스트", trigger: "상단 안착 실패" }
      ],
      riskChecklist: [
        { label: "무효화 거리", status: "확인 필요", note: "현재가와 무효화 구간 차이가 짧습니다." },
        { label: "이벤트 리스크", status: "주의", note: "정책/규제 변수 민감" },
        { label: "과열 여부", status: "양호", note: "과열 신호는 완화되었습니다." }
      ],
      newsImpact: [
        {
          headline: "클라우드와 AI 투자 확대 계획",
          impact: "긍정",
          summary: "장기 성장 narrative에는 우호적입니다.",
          source: "manual",
          url: "https://example.com/035420-news-1",
          date: "2026-03-06",
          eventType: "curated-news"
        }
      ],
      dataQuality: [
        { label: "시세", value: "정상", note: "시세 스냅샷 최신" },
        { label: "뉴스", value: "1건", note: "운영자 큐레이션 포함" },
        { label: "품질", value: "보통", note: "국내 기사 coverage 보강 중" }
      ]
    },
    {
      ticker: "068270",
      company: "셀트리온",
      signalTone: "주의",
      score: 44,
      headline: "반등 시도보다 무효화 구간 방어 여부를 먼저 봐야 하는 상태입니다.",
      invalidation: "165,000원 하회 시 현재 관찰 신호를 종료합니다.",
      analysisSummary: [
        { label: "현재 해석", value: "경계 구간", note: "반등보다 방어 확인 우선" },
        { label: "우선 체크", value: "최근 저점", note: "이탈 시 관찰 종료" },
        { label: "이벤트 감도", value: "매우 높음", note: "공시와 바이오 이벤트 민감" },
        { label: "데이터 품질", value: "보통", note: "이벤트 coverage는 충분" }
      ],
      keyLevels: [
        { label: "무효화", price: "165,000원", meaning: "최근 저점 이탈" },
        { label: "확인", price: "171,500원", meaning: "반등 유지 여부 확인" },
        { label: "확장", price: "176,000원", meaning: "강세 시나리오 전환 확인" }
      ],
      decisionNotes: [
        "현재 구간은 하방 방어 확인이 우선입니다.",
        "공시 이벤트는 잦지만 가격 반응의 지속성은 더 확인이 필요합니다.",
        "무효화 거리 대비 기대값은 아직 불리합니다."
      ],
      scoreBreakdown: [
        { label: "추세 구조", score: 12, description: "하락 추세 복원 미완" },
        { label: "수급", score: 9, description: "주체 수급 불안정" },
        { label: "변동성", score: 8, description: "변동성 확대 국면" },
        { label: "이벤트", score: 7, description: "공시/바이오 이벤트 민감" },
        { label: "품질", score: 8, description: "coverage는 유지" }
      ],
      scenarios: [
        { label: "기본", probability: 45, expectation: "약한 반등 후 재확인", trigger: "거래량 감소" },
        { label: "강세", probability: 15, expectation: "이벤트 기반 강세 시도", trigger: "호재 공시 동반" },
        { label: "약세", probability: 40, expectation: "저점 재시험", trigger: "저점 하향 이탈" }
      ],
      riskChecklist: [
        { label: "무효화 거리", status: "주의", note: "현재가와 무효화 가격 차이가 짧습니다." },
        { label: "이벤트 리스크", status: "주의", note: "공시 민감도가 높습니다." },
        { label: "과열 여부", status: "양호", note: "과열보다는 방어 구간입니다." }
      ],
      newsImpact: [
        {
          headline: "[공시] 스텔라라 시밀러 3상 결과 공시",
          impact: "긍정",
          summary: "바이오 모멘텀 측면에서는 우호적입니다.",
          source: "dart",
          url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260306000111",
          date: "2026-03-06",
          eventType: "disclosure"
        },
        {
          headline: "자사주 911만주 소각 추진",
          impact: "긍정",
          summary: "주주환원 이벤트로 단기 심리 방어에 기여합니다.",
          source: "naver-search",
          url: "https://example.com/068270-news-1",
          date: "2026-03-06",
          eventType: "news"
        }
      ],
      dataQuality: [
        { label: "시세", value: "정상", note: "시세 스냅샷 최신" },
        { label: "뉴스", value: "2건", note: "공시 1건 포함" },
        { label: "품질", value: "보통", note: "이벤트 coverage는 충분" }
      ]
    }
  ]
};
