export type AppTutorialScope =
  | "today"
  | "opening-check"
  | "signals"
  | "analysis"
  | "portfolio"
  | "position-detail"
  | "account";

export interface AppTutorialStep {
  title: string;
  body: string;
  bullets?: string[];
  target?: string;
  spotlightLabel?: string;
  spotlightPadding?: number;
}

export interface AppTutorialDefinition {
  scope: AppTutorialScope;
  label: string;
  shortLabel: string;
  version: number;
  steps: AppTutorialStep[];
}

export const APP_TUTORIAL_DEFINITIONS: Record<AppTutorialScope, AppTutorialDefinition> = {
  today: {
    scope: "today",
    label: "Today 튜토리얼",
    shortLabel: "Today",
    version: 2,
    steps: [
      {
        title: "Today는 오늘의 우선순위만 앞으로 끌어오는 메인 루프입니다.",
        body: "추천을 많이 나열하는 화면이 아니라, 지금 당장 해야 할 행동을 장초 확인, 매수 검토, 보유 관리 순서로 잘라 보여주는 시작 화면입니다.",
        target: '[data-tutorial="today-actions"]',
        spotlightLabel: "오늘의 메인 루프",
        bullets: [
          "개장일에는 행동 우선순위를 짧게 압축합니다.",
          "휴장일에는 복기와 다음 계획 쪽으로 흐름이 바뀝니다."
        ]
      },
      {
        title: "첫 카드에서 오늘 먼저 볼 종목을 거릅니다.",
        body: "장이 열려 있으면 Opening Check로, 쉬는 날이면 최근 기록 복기로 자연스럽게 이어지도록 같은 자리에 가장 먼저 볼 카드가 배치됩니다.",
        target: '[data-tutorial="today-opening-card"]',
        spotlightLabel: "첫 번째 행동"
      },
      {
        title: "둘째 카드는 실제 매수 검토 후보만 남깁니다.",
        body: "장초 확인을 통과한 종목만 매수 검토 카드에 남고, 카드 안에서 신뢰 요약까지 바로 읽을 수 있어 공통 후보와 실제 행동 후보를 구분하기 쉽습니다.",
        target: '[data-tutorial="today-buy-card"]',
        spotlightLabel: "오늘 매수 검토",
        bullets: [
          "Signals에서 보던 공통 후보가 여기서 실제 행동 후보로 다시 좁혀집니다.",
          "휴장일에는 같은 위치가 새 계획 만들기 카드로 바뀝니다."
        ]
      },
      {
        title: "보유 관리는 추천과 별도 루틴으로 끊어 둡니다.",
        body: "새 진입을 볼지 말지와 이미 가진 포지션을 어떻게 관리할지는 다른 판단이라서, Today 안에서도 보유 관리를 따로 한 칸으로 분리했습니다.",
        target: '[data-tutorial="today-holding-card"]',
        spotlightLabel: "보유 관리"
      },
      {
        title: "공통 흐름과 내 기록 흐름을 함께 읽습니다.",
        body: "커뮤니티 펄스 영역은 오늘 시장 쪽 메시지, 최근 반복 패턴, 서비스 공통 흐름을 묶어 보여줘서 개별 종목을 보기 전에 배경 리듬을 먼저 잡게 합니다.",
        target: '[data-tutorial="today-community-stats"]',
        spotlightLabel: "시장 흐름 요약"
      },
      {
        title: "아래 세부 목록은 실행 전 마지막 점검용입니다.",
        body: "메인 카드에서 방향을 잡은 뒤에는 세부 목록에서 후보를 조금 더 자세히 보고 Analysis나 Portfolio로 내려갑니다. Today는 이 두 화면으로 흘려 보내는 관문에 가깝습니다.",
        target: '[data-tutorial="today-detail-list"]',
        spotlightLabel: "세부 목록"
      }
    ]
  },
  "opening-check": {
    scope: "opening-check",
    label: "Opening Check 튜토리얼",
    shortLabel: "Opening Check",
    version: 2,
    steps: [
      {
        title: "Opening Check는 한 번에 한 종목만 판단하게 만든 화면입니다.",
        body: "아침에 여러 후보를 동시에 읽기 시작하면 루틴이 무너지기 쉬워서, 지금 확인할 종목 하나만 크게 보고 바로 저장하게 설계했습니다.",
        target: '[data-tutorial="opening-current"]',
        spotlightLabel: "현재 확인 중인 종목"
      },
      {
        title: "상단 카드에서 가격 계획과 유동성을 먼저 읽습니다.",
        body: "체크를 누르기 전에 진입 구간, 손절 기준, 유동성이 기본 전제로 같이 보여서 무작정 통과 여부만 찍지 않게 합니다.",
        target: '[data-tutorial="opening-current"]',
        spotlightLabel: "종목 기본 맥락"
      },
      {
        title: "핵심 입력은 세 가지 체크뿐입니다.",
        body: "갭 상태, 확인 가격 반응, 오늘 행동 의도만 고르면 됩니다. 장초 확인은 길게 서술하는 화면이 아니라 짧은 판단을 기록하는 화면입니다.",
        target: '[data-tutorial="opening-checklist"]',
        spotlightLabel: "3개 체크",
        bullets: [
          "갭은 시작 위치를 읽습니다.",
          "확인 가격 반응은 진입 근거가 살아 있는지 봅니다.",
          "오늘 행동은 실제 의도를 남깁니다."
        ]
      },
      {
        title: "자동 제안은 안전장치입니다.",
        body: "세 체크 결과에 최근 위험 패턴과 개인 규칙까지 더해 더 보수적인 상태를 제안합니다. 서비스가 왜 낮게 보는지 여기서 바로 읽을 수 있습니다.",
        target: '[data-tutorial="opening-suggestion"]',
        spotlightLabel: "자동 제안 상태"
      },
      {
        title: "저장 전에는 제안 유지, 수동 조정, 메모를 한 곳에서 끝냅니다.",
        body: "자동 제안을 그대로 따를지, 최종 상태를 덮어쓸지, 메모를 남길지 모두 같은 카드 안에서 처리합니다. 서비스 공통 판단은 참고용으로만 두고 Today는 내 저장 결과를 우선합니다.",
        target: '[data-tutorial="opening-suggestion"]',
        spotlightLabel: "최종 저장 영역",
        bullets: [
          "제안대로 저장하거나 직접 상태를 바꿀 수 있습니다.",
          "메모를 남기면 나중에 Reviews와 규칙 승격 흐름에 다시 연결됩니다."
        ]
      },
      {
        title: "저장 후에는 다음 종목으로 바로 넘어갑니다.",
        body: "오른쪽 목록은 긴 watchlist가 아니라 현재 순서와 다음 후보를 짧게 보여주는 큐입니다. 한 종목씩 저장하고 넘기는 것이 이 화면의 핵심 사용법입니다.",
        target: '[data-tutorial="opening-queue"]',
        spotlightLabel: "다음 순서"
      }
    ]
  },
  signals: {
    scope: "signals",
    label: "Signals 튜토리얼",
    shortLabel: "Signals",
    version: 2,
    steps: [
      {
        title: "Signals는 공통 후보를 넓게 훑는 시작 화면입니다.",
        body: "Today가 오늘 해야 할 일에 가까운 화면이라면, Signals는 공통 후보를 넓게 스캔하고 비교하는 탐색 화면입니다.",
        target: '[data-tutorial="signals-quick-view"]',
        spotlightLabel: "빠른 보기"
      },
      {
        title: "빠른 보기 프리셋으로 먼저 덩어리를 줄입니다.",
        body: "전체, 내 기준만, 매수 검토만, 장초 확인 후보처럼 자주 쓰는 묶음을 한 번에 걸러서 처음부터 너무 많은 종목을 보지 않게 합니다.",
        target: '[data-tutorial="signals-quick-view"]',
        spotlightLabel: "빠른 보기 프리셋"
      },
      {
        title: "상단 요약은 지금 필터 결과를 한 문장으로 번역합니다.",
        body: "필터를 많이 건 뒤에도 현재 결과가 어떤 성격의 후보군인지 잃지 않도록, 지금 보고 있는 덩어리를 짧은 문장으로 다시 설명합니다.",
        target: '[data-tutorial="signals-summary"]',
        spotlightLabel: "현재 후보 요약"
      },
      {
        title: "검색과 필터는 후보를 짧게 만드는 도구입니다.",
        body: "종목명, 섹터, 내 기준, 검증 기준을 함께 써서 지금 필요한 범위만 남긴 뒤 비교표를 보는 것이 가장 빠른 사용 흐름입니다.",
        target: '[data-tutorial="signals-filters"]',
        spotlightLabel: "필터 / 검색"
      },
      {
        title: "신뢰 읽기 블록에서 검증 수준을 해석합니다.",
        body: "실측 기반인지, 추적 가능한 공용 패턴인지, 유사 업종 fallback인지, 최근 장초 패턴이 강한지 약한지 한 번에 읽도록 만든 영역입니다.",
        target: '[data-tutorial="signals-trust"]',
        spotlightLabel: "신뢰 읽기"
      },
      {
        title: "검증 분포는 현재 후보군의 바닥 품질을 보여줍니다.",
        body: "개별 종목 하나만 좋게 보여도 전체 후보군이 fallback 위주인지, 실측이 얼마나 섞여 있는지는 따로 봐야 합니다. 이 영역이 그 판단을 돕습니다.",
        target: '[data-tutorial="signals-distribution"]',
        spotlightLabel: "검증 근거 분포"
      },
      {
        title: "내 기준 요약은 공통 후보를 개인 실행 후보로 다시 번역합니다.",
        body: "같은 필터 결과라도 내 계좌 기준으로는 매수 검토, 관찰, 보류, 장초 확인 전으로 다시 나뉩니다. 공통 후보와 개인 실행 후보를 구분해 읽는 단계입니다.",
        target: '[data-tutorial="signals-personal-summary"]',
        spotlightLabel: "내 기준 빠른 해석"
      },
      {
        title: "마지막 결정은 비교표에서 내립니다.",
        body: "Signals의 끝은 카드가 아니라 비교표입니다. 후보를 줄인 뒤 순위표에서 한 번 더 비교하고, 필요한 종목만 Analysis로 내려가면 됩니다.",
        target: '[data-tutorial="signals-table"]',
        spotlightLabel: "전체 종목 순위표",
        spotlightPadding: 10
      }
    ]
  },
  analysis: {
    scope: "analysis",
    label: "종목 상세 튜토리얼",
    shortLabel: "Analysis",
    version: 2,
    steps: [
      {
        title: "Analysis는 한 종목의 행동 계획을 고정하는 화면입니다.",
        body: "Signals에서 후보를 좁힌 뒤, 이 화면에서 왜 지금 보는지와 어떤 가격 기준으로 움직일지를 한 번 더 정리합니다.",
        target: '[data-tutorial="analysis-plan"]',
        spotlightLabel: "계획 카드"
      },
      {
        title: "신뢰 요약으로 데이터 바닥을 먼저 확인합니다.",
        body: "계획이 좋아 보여도 검증이 얇으면 해석 강도를 낮춰야 하므로, 실측 여부, 추적 수준, 최근 패턴 강약을 먼저 읽고 들어가는 것이 좋습니다.",
        target: '[data-tutorial="analysis-trust"]',
        spotlightLabel: "검증 / 신뢰"
      },
      {
        title: "공통 후보와 내 기준 해석을 나눠 봅니다.",
        body: "서비스 공통 순위와 내 계좌 기준 해석, 그리고 다음 이동 화면을 따로 적어 둬서 같은 종목을 왜 다르게 읽는지 분명하게 만듭니다.",
        target: '[data-tutorial="analysis-action-flow"]',
        spotlightLabel: "행동 흐름"
      },
      {
        title: "가격 핵심 값은 한 줄 설명과 함께 모아 둡니다.",
        body: "현재가, 매수 구간, 손절, 목표, 예상 보유 기간, 기대 손익비를 카드형으로 분리해서 계획의 숫자 뼈대를 바로 확인할 수 있습니다.",
        target: '[data-tutorial="analysis-metrics"]',
        spotlightLabel: "계획 숫자"
      },
      {
        title: "가장 중요한 문장은 다음 행동입니다.",
        body: "상세 설명을 길게 읽더라도 실제 행동 문장 하나가 남아야 하므로, 지금 바로 할 일을 가장 짧은 문장으로 다시 강조합니다.",
        target: '[data-tutorial="analysis-next-action"]',
        spotlightLabel: "다음 행동"
      },
      {
        title: "아래 가이드는 진입 전 확인과 실패 조건을 정리합니다.",
        body: "진입 전에 볼 것, 손절 해석, 목표 구간 읽기, 지금 보는 이유와 조심할 점까지 마지막 체크리스트처럼 정리해 둔 영역입니다.",
        target: '[data-tutorial="analysis-guides"]',
        spotlightLabel: "세부 가이드"
      }
    ]
  },
  portfolio: {
    scope: "portfolio",
    label: "Portfolio 튜토리얼",
    shortLabel: "Portfolio",
    version: 2,
    steps: [
      {
        title: "Portfolio는 기록, 보유, 복기를 한 화면군으로 묶는 작업 공간입니다.",
        body: "실제 자산 상태와 체결 기록, 종료 회고, 성과 흐름, 개인 규칙 관리까지 모두 여기서 이어집니다.",
        target: '[data-tutorial="portfolio-tabs"]',
        spotlightLabel: "Portfolio 탭"
      },
      {
        title: "Holdings에서는 지금 살아 있는 포지션만 다룹니다.",
        body: "추가 매수, 부분 익절, 손절, 전량 매도처럼 현재 보유 종목에 바로 필요한 액션을 빠르게 처리하는 탭입니다.",
        target: '[data-tutorial="portfolio-holdings"]',
        spotlightLabel: "Holdings"
      },
      {
        title: "Journal은 실제 체결 기록의 원장입니다.",
        body: "무엇을 언제 얼마에 기록했는지를 시간 순서대로 확인하고, 방금 남긴 체결도 여기서 다시 수정하거나 되돌릴 수 있습니다.",
        target: '[data-tutorial="portfolio-journal"]',
        spotlightLabel: "Journal"
      },
      {
        title: "Reviews는 종료 거래를 복기하는 탭입니다.",
        body: "종료된 거래의 잘한 점, 아쉬운 점, 다음 규칙 후보를 다시 읽고 개인 규칙 엔진으로 이어 붙이는 구간입니다.",
        target: '[data-tutorial="portfolio-reviews"]',
        spotlightLabel: "Reviews"
      },
      {
        title: "Performance는 기록 흐름을 숫자로 다시 봅니다.",
        body: "실현 손익, 전략 태그, 반복 패턴, 규칙 영향 같은 흐름을 숫자로 다시 읽으면서 감각이 아니라 기록 기준으로 회고하게 만듭니다.",
        target: '[data-tutorial="portfolio-performance"]',
        spotlightLabel: "Performance"
      },
      {
        title: "Rules 탭은 승격된 개인 규칙의 관리 화면입니다.",
        body: "이제 규칙 엔진을 보이지 않는 내부 기능으로 두지 않고, 언제 승격됐는지, 최근 어디에 영향을 줬는지, 지금 켜져 있는지를 한 곳에서 관리합니다.",
        target: '[data-tutorial="portfolio-rules"]',
        spotlightLabel: "Rules"
      }
    ]
  },
  "position-detail": {
    scope: "position-detail",
    label: "포지션 상세 튜토리얼",
    shortLabel: "Position",
    version: 2,
    steps: [
      {
        title: "포지션 상세는 한 종목의 전체 수명주기를 읽는 화면입니다.",
        body: "언제 진입했고, 어떻게 관리했고, 어떻게 끝났는지를 종목 단위로 다시 연결해 보는 복기 화면입니다.",
        target: '[data-tutorial="position-header"]',
        spotlightLabel: "포지션 개요"
      },
      {
        title: "상단 카드에서 현재 상태와 빠른 액션을 함께 봅니다.",
        body: "남은 수량, 평단, 손익, 실현 손익과 함께 추가 매수나 청산 같은 빠른 액션 버튼이 붙어 있어 기록과 실행이 끊기지 않습니다.",
        target: '[data-tutorial="position-header"]',
        spotlightLabel: "현재 상태"
      },
      {
        title: "차트에는 실제 체결 이벤트가 같이 얹힙니다.",
        body: "매수, 부분 익절, 손절 같은 이벤트가 차트 위에 표시돼서 가격 흐름과 기록을 따로 보지 않아도 됩니다.",
        target: '[data-tutorial="position-chart"]',
        spotlightLabel: "포지션 차트"
      },
      {
        title: "계획 대비 실제는 복기의 기준선입니다.",
        body: "처음 계획했던 가격과 실제 체결, 손절, 목표 도달 여부를 같은 카드 안에서 비교해 무엇이 어긋났는지 바로 읽을 수 있습니다.",
        target: '[data-tutorial="position-comparison"]',
        spotlightLabel: "계획 대비 실제"
      },
      {
        title: "타임라인은 기록 순서를 다시 확인하는 원장입니다.",
        body: "이 종목에서 어떤 이벤트가 어떤 순서로 쌓였는지 시간축으로 다시 보면서 메모와 체결 맥락을 복원합니다.",
        target: '[data-tutorial="position-timeline"]',
        spotlightLabel: "체결 타임라인"
      },
      {
        title: "다음 행동 카드는 지금 포지션 관리 기준을 남깁니다.",
        body: "보유 중이라면 지금 무엇을 해야 하는지, 종료 상태라면 왜 그런 판단이 나왔는지를 현재 계획과 이유 메모로 다시 보여줍니다.",
        target: '[data-tutorial="position-next-action"]',
        spotlightLabel: "현재 계획과 다음 행동"
      },
      {
        title: "마지막은 회고와 메모로 닫습니다.",
        body: "자동 회고, 직접 남긴 종료 회고, 보유 메모를 모아 두고 이 내용이 나중에 Reviews와 개인 규칙 승격으로 다시 이어집니다.",
        target: '[data-tutorial="position-review"]',
        spotlightLabel: "회고와 메모"
      }
    ]
  },
  account: {
    scope: "account",
    label: "Account 튜토리얼",
    shortLabel: "Account",
    version: 2,
    steps: [
      {
        title: "Account는 계정 상태와 진입점 관리 화면입니다.",
        body: "실제 자산 편집은 Portfolio에서 하지만, 계정 상태 확인과 튜토리얼 재실행, 로그아웃 같은 관리 동작은 여기로 모아 둡니다.",
        target: '[data-tutorial="account-overview"]',
        spotlightLabel: "계정 개요"
      },
      {
        title: "계정 정보 카드에서 세션과 로그아웃을 확인합니다.",
        body: "이름, 이메일, 가입일, 세션 만료 같은 기본 정보와 로그아웃 버튼이 함께 있어 모바일에서도 계정 제어 동선이 분명합니다.",
        target: '[data-tutorial="account-info"]',
        spotlightLabel: "계정 정보"
      },
      {
        title: "포트폴리오 연결 카드는 현재 자산 프로필을 요약합니다.",
        body: "지금 어떤 포트폴리오 프로필이 연결되어 있는지, 보유 종목 수와 현금 상태가 어떤지 확인하고 Portfolio나 Dashboard로 바로 이동할 수 있습니다.",
        target: '[data-tutorial="account-portfolio"]',
        spotlightLabel: "포트폴리오 연결"
      },
      {
        title: "튜토리얼은 여기서 언제든 다시 실행할 수 있습니다.",
        body: "현재 화면만 다시 볼 수도 있고, 전체 튜토리얼을 처음부터 다시 열 수도 있습니다. 제품이 커질수록 이 진입점이 더 중요해집니다.",
        target: '[data-tutorial="account-tutorial"]',
        spotlightLabel: "튜토리얼 다시 보기"
      },
      {
        title: "튜토리얼은 한 번 보고 끝내는 기능이 아닙니다.",
        body: "Today, Signals, Portfolio, Position Detail을 오가다가 흐름이 헷갈리면 Account에서 다시 열어 현재 화면의 역할을 빠르게 복기하면 됩니다."
      }
    ]
  }
};

export function resolveTutorialScope(pathname: string): AppTutorialScope | null {
  if (pathname === "/recommendations") {
    return "today";
  }

  if (pathname === "/opening-check") {
    return "opening-check";
  }

  if (pathname === "/signals" || pathname === "/ranking") {
    return "signals";
  }

  if (pathname.startsWith("/analysis/")) {
    return "analysis";
  }

  if (pathname === "/portfolio") {
    return "portfolio";
  }

  if (pathname.startsWith("/portfolio/")) {
    return "position-detail";
  }

  if (pathname === "/account") {
    return "account";
  }

  return null;
}
