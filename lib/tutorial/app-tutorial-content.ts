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
  steps: AppTutorialStep[];
}

export const APP_TUTORIAL_DEFINITIONS: Record<AppTutorialScope, AppTutorialDefinition> = {
  today: {
    scope: "today",
    label: "Today 튜토리얼",
    shortLabel: "Today",
    steps: [
      {
        title: "Today는 오늘 해야 할 일만 보는 화면입니다.",
        body: "개장일에는 장초 확인·매수 검토·보유 관리만, 휴장일에는 지난 기록 복기·새 계획 만들기·보유 관리만 먼저 보여줍니다.",
        target: '[data-tutorial="today-actions"]',
        spotlightLabel: "오늘 먼저 볼 카드"
      },
      {
        title: "장초 확인부터 시작합니다.",
        body: "개장 직후에는 장초 확인 카드부터 열어 오늘 먼저 볼 종목을 빠르게 걸러내고, 휴장일에는 같은 자리에 지난 기록 복기 카드가 나타납니다.",
        target: '[data-tutorial="today-opening-card"]',
        spotlightLabel: "장초 확인"
      },
      {
        title: "통과한 종목만 매수 검토로 이어집니다.",
        body: "장초 확인을 통과한 종목만 오늘 매수 검토 카드에 남고, 휴장일에는 같은 위치에서 다음 개장을 위한 새 계획 만들기 카드로 바뀝니다.",
        target: '[data-tutorial="today-buy-card"]',
        spotlightLabel: "오늘 매수 검토"
      },
      {
        title: "보유 관리는 따로 모아 봅니다.",
        body: "이미 들고 있는 종목의 익절, 손절, 시간 점검은 Portfolio가 아니라 Today의 보유 관리 카드에서도 바로 이어집니다.",
        target: '[data-tutorial="today-holding-card"]',
        spotlightLabel: "보유 관리"
      }
    ]
  },
  "opening-check": {
    scope: "opening-check",
    label: "Opening Check 튜토리얼",
    shortLabel: "Opening Check",
    steps: [
      {
        title: "한 번에 한 종목만 집중합니다.",
        body: "여러 종목을 동시에 읽기보다, 지금 확인할 종목 하나만 크게 보고 판단하도록 만든 화면입니다.",
        target: '[data-tutorial="opening-current"]',
        spotlightLabel: "현재 확인 중인 종목"
      },
      {
        title: "세 가지 체크만 고르면 됩니다.",
        body: "갭 상태, 확인 가격 반응, 오늘 행동 세 가지만 고르면 자동 제안 상태가 바로 계산됩니다.",
        target: '[data-tutorial="opening-checklist"]',
        spotlightLabel: "3개 체크"
      },
      {
        title: "자동 제안은 참고이자 안전장치입니다.",
        body: "현재 체크와 개인 규칙, 최근 위험 패턴을 같이 보고 더 보수적인 제안 상태로 조정할 수 있습니다.",
        target: '[data-tutorial="opening-suggestion"]',
        spotlightLabel: "자동 제안 상태"
      },
      {
        title: "저장 후 다음으로 빠르게 넘깁니다.",
        body: "오른쪽 목록은 현재 순서와 다음 종목만 짧게 보여줘서, 아침 루틴을 끊지 않고 이어 가게 합니다.",
        target: '[data-tutorial="opening-queue"]',
        spotlightLabel: "다음 순서"
      }
    ]
  },
  signals: {
    scope: "signals",
    label: "Signals 튜토리얼",
    shortLabel: "Signals",
    steps: [
      {
        title: "Signals는 공통 후보를 스캔하는 화면입니다.",
        body: "모든 사용자가 함께 보는 공통 후보를 빠르게 좁혀 보고, 필요한 종목만 상세 분석으로 들어가는 곳입니다.",
        target: '[data-tutorial="signals-quick-view"]',
        spotlightLabel: "빠른 보기"
      },
      {
        title: "빠른 보기를 먼저 고르면 스캔이 빨라집니다.",
        body: "전체, 내 기준만, 매수 검토만, 장초 확인 후보처럼 바로 후보를 줄이는 프리셋이 준비되어 있습니다.",
        target: '[data-tutorial="signals-quick-view"]',
        spotlightLabel: "빠른 보기 프리셋"
      },
      {
        title: "필터로 후보를 더 짧게 줄입니다.",
        body: "검색, 섹터, 검증 기준, 내 기준 필터를 함께 써서 지금 필요한 종목만 남긴 뒤 표를 읽으면 훨씬 빠릅니다.",
        target: '[data-tutorial="signals-filters"]',
        spotlightLabel: "필터 / 검색"
      },
      {
        title: "마지막은 비교표로 정리합니다.",
        body: "카드보다 표를 중심으로 보고, 필요한 종목만 상세로 내려가면 훨씬 덜 복잡하게 사용할 수 있습니다.",
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
    steps: [
      {
        title: "종목 상세는 계획을 정리하는 화면입니다.",
        body: "왜 이 종목을 보는지, 어떤 가격과 규칙으로 움직일지 한 번에 정리해 두는 곳입니다.",
        target: '[data-tutorial="analysis-plan"]',
        spotlightLabel: "계획 카드"
      },
      {
        title: "공통 후보와 내 해석을 함께 봅니다.",
        body: "공통 후보 순서와 내 계좌 기준 해석을 나눠 보여줘서, 같은 종목도 왜 다르게 읽히는지 이해하게 합니다.",
        target: '[data-tutorial="analysis-action-flow"]',
        spotlightLabel: "공통 후보 vs 내 해석"
      },
      {
        title: "다음 행동은 가장 짧게 정리합니다.",
        body: "지금 당장 확인할 행동 문장 하나만 크게 보여줘서, 상세를 읽고도 다음 동작이 흐려지지 않게 합니다.",
        target: '[data-tutorial="analysis-next-action"]',
        spotlightLabel: "다음 행동"
      },
      {
        title: "여기서 Today나 Opening Check로 다시 이어집니다.",
        body: "종목 상세는 끝점이 아니라, 실제 행동 화면으로 다시 연결되는 중간 정리 화면입니다."
      }
    ]
  },
  portfolio: {
    scope: "portfolio",
    label: "Portfolio 튜토리얼",
    shortLabel: "Portfolio",
    steps: [
      {
        title: "Portfolio는 내 자산과 보유를 관리하는 곳입니다.",
        body: "현재 보유 종목, 체결 기록, 종료 회고, 성과 흐름을 모두 여기서 이어서 관리합니다.",
        target: '[data-tutorial="portfolio-tabs"]',
        spotlightLabel: "Portfolio 탭"
      },
      {
        title: "Holdings는 지금 들고 있는 종목만 봅니다.",
        body: "추가 매수, 부분 익절, 손절, 전량 매도처럼 지금 필요한 액션을 가장 빠르게 기록하는 탭입니다.",
        target: '[data-tutorial="portfolio-holdings"]',
        spotlightLabel: "현재 보유 종목"
      },
      {
        title: "Journal은 실제 체결 기록을 모아 봅니다.",
        body: "무엇을 언제 얼마에 기록했는지 시간 순서대로 확인하고, 방금 기록한 체결도 다시 수정할 수 있습니다.",
        target: '[data-tutorial="portfolio-journal"]',
        spotlightLabel: "Journal"
      },
      {
        title: "Reviews는 종료 거래를 복기하는 탭입니다.",
        body: "종료된 거래의 회고, 반복 규칙 후보, 직접 남긴 메모를 다시 읽어 다음 행동 기준으로 연결합니다.",
        target: '[data-tutorial="portfolio-reviews"]',
        spotlightLabel: "Reviews"
      },
      {
        title: "Performance는 기록의 흐름을 숫자로 다시 봅니다.",
        body: "실현손익, 규칙 영향, 전략 태그, 반복 회고 규칙을 기간별로 다시 읽어 실제 성과 흐름을 확인합니다.",
        target: '[data-tutorial="portfolio-performance"]',
        spotlightLabel: "Performance"
      }
    ]
  },
  "position-detail": {
    scope: "position-detail",
    label: "포지션 상세 튜토리얼",
    shortLabel: "Position",
    steps: [
      {
        title: "포지션 상세는 한 종목의 전체 흐름을 보는 화면입니다.",
        body: "언제 들어갔고, 어떻게 관리했고, 어떻게 끝났는지를 한 종목 단위로 정리해 둡니다.",
        target: '[data-tutorial="position-header"]',
        spotlightLabel: "포지션 개요"
      },
      {
        title: "차트 위에 실제 이벤트가 표시됩니다.",
        body: "매수, 부분 익절, 손절 같은 이벤트가 차트 위에 마커로 찍혀서 기록과 가격 흐름을 같이 볼 수 있습니다.",
        target: '[data-tutorial="position-chart"]',
        spotlightLabel: "포지션 차트"
      },
      {
        title: "계획 대비 실제를 바로 비교합니다.",
        body: "처음 계획했던 가격과 실제 체결, 손절, 목표 도달 여부를 한 화면에서 비교해 복기할 수 있습니다.",
        target: '[data-tutorial="position-comparison"]',
        spotlightLabel: "계획 대비 실제"
      },
      {
        title: "마지막은 회고로 이어집니다.",
        body: "자동 회고와 직접 입력한 회고를 함께 남겨서, 다음 날 Today와 Opening Check의 개인 규칙으로 다시 반영합니다.",
        target: '[data-tutorial="position-review"]',
        spotlightLabel: "회고와 메모"
      }
    ]
  },
  account: {
    scope: "account",
    label: "Account 튜토리얼",
    shortLabel: "Account",
    steps: [
      {
        title: "Account는 계정과 세션을 확인하는 화면입니다.",
        body: "실제 자산 편집은 Portfolio에서 하고, 여기서는 계정 상태와 현재 연결된 포트폴리오를 확인합니다.",
        target: '[data-tutorial="account-overview"]',
        spotlightLabel: "계정 요약"
      },
      {
        title: "튜토리얼은 언제든 다시 볼 수 있습니다.",
        body: "처음 1회 자동으로 뜨지만, 이후에는 여기서 현재 화면 또는 전체 튜토리얼을 다시 실행할 수 있습니다.",
        target: '[data-tutorial="account-tutorial"]',
        spotlightLabel: "튜토리얼 다시 보기"
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
