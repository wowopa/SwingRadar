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
        title: "Today는 오늘 할 행동만 남기는 화면입니다.",
        body: "설명보다 행동을 먼저 보게 만든 메인 화면입니다. 먼저 무엇을 해야 하는지 세 카드로만 정리해 보여줍니다."
      },
      {
        title: "장초 확인부터 시작합니다.",
        body: "아침에 먼저 볼 후보를 빠르게 체크하고 통과·관찰·보류를 저장합니다.",
        bullets: ["장초 확인이 끝나야 오늘 매수 검토가 정리됩니다.", "주말·공휴일에는 복기와 계획 흐름으로 바뀝니다."]
      },
      {
        title: "오늘 매수 검토는 통과 종목만 남깁니다.",
        body: "장초 확인을 통과한 종목만 실제 검토 대상으로 남기고, 상세 분석으로 바로 이동할 수 있습니다."
      },
      {
        title: "보유 관리는 이미 가진 종목만 봅니다.",
        body: "익절·손절·보호 가격 상향처럼 지금 들고 있는 종목의 다음 행동만 따로 확인합니다."
      }
    ]
  },
  "opening-check": {
    scope: "opening-check",
    label: "Opening Check 튜토리얼",
    shortLabel: "Opening Check",
    steps: [
      {
        title: "현재 종목 하나에만 집중합니다.",
        body: "한 번에 여러 종목을 읽지 않고, 지금 확인할 종목 하나만 크게 보여줍니다."
      },
      {
        title: "세 가지 체크만 고르면 됩니다.",
        body: "갭 상태, 확인 가격 반응, 오늘 행동 세 가지만 고르면 자동 제안 상태가 계산됩니다."
      },
      {
        title: "자동 제안은 참고용입니다.",
        body: "서비스 제안과 내 규칙, 최근 위험 패턴을 함께 보고 최종 상태를 저장합니다."
      },
      {
        title: "저장 후 다음으로 반복합니다.",
        body: "아침 루틴은 길게 읽는 대신, 저장하고 바로 다음 종목으로 넘어가도록 설계되어 있습니다."
      }
    ]
  },
  signals: {
    scope: "signals",
    label: "Signals 튜토리얼",
    shortLabel: "Signals",
    steps: [
      {
        title: "Signals는 공통 후보를 보는 곳입니다.",
        body: "모든 사용자가 함께 보는 공통 후보와 공용 복기 이력을 확인하는 화면입니다."
      },
      {
        title: "빠른 보기로 바로 좁힐 수 있습니다.",
        body: "전체, 내 기준만, 매수 검토만, 장초 확인 후보 같은 프리셋으로 바로 좁혀볼 수 있습니다."
      },
      {
        title: "표에서는 공통 후보와 내 해석을 함께 봅니다.",
        body: "순위표는 공통 후보 순서를 보여주고, 행 배지는 내 계좌 기준 해석을 따로 알려줍니다."
      },
      {
        title: "마음에 드는 종목은 상세로 이동합니다.",
        body: "상세 화면에서 계획 가격, 장초 주의 패턴, 내 기준 행동 해석까지 더 자세히 확인합니다."
      }
    ]
  },
  analysis: {
    scope: "analysis",
    label: "종목 상세 튜토리얼",
    shortLabel: "Analysis",
    steps: [
      {
        title: "종목 상세는 공통 후보와 내 해석을 같이 보는 곳입니다.",
        body: "서비스가 왜 이 종목을 봤는지와, 내 계좌 기준으로는 어떻게 해석되는지를 한 화면에 모아둡니다."
      },
      {
        title: "계획 가격을 먼저 확인합니다.",
        body: "진입 구간, 손절 기준, 목표 가격처럼 실제 판단에 필요한 가격 계획이 상단에 정리됩니다."
      },
      {
        title: "장초 패턴과 개인 규칙도 함께 봅니다.",
        body: "최근 잘 맞은 패턴, 위험 패턴, 내 규칙 경고가 있으면 상단에서 바로 확인할 수 있습니다."
      },
      {
        title: "다음 행동은 Today와 Portfolio로 이어집니다.",
        body: "아침 검토가 끝나면 Today로, 실제 체결 후에는 Portfolio로 흐름이 자연스럽게 이어집니다."
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
        body: "현재 보유 종목, 체결 기록, 종료 회고, 성과 흐름을 모두 여기서 봅니다."
      },
      {
        title: "Holdings는 지금 가진 종목만 보여줍니다.",
        body: "빠른 액션으로 추가 매수, 부분 익절, 손절, 전량 매도를 바로 기록할 수 있습니다."
      },
      {
        title: "Journal은 실제 체결 기록입니다.",
        body: "무엇을 언제 얼마에 했는지 기록을 남기고, 방금 기록 수정이나 되돌리기도 할 수 있습니다."
      },
      {
        title: "Reviews와 Performance는 복기용입니다.",
        body: "종료 거래 회고, 반복 규칙, 성과 곡선과 기간별 통계를 보며 내 기준을 더 선명하게 만듭니다."
      }
    ]
  },
  "position-detail": {
    scope: "position-detail",
    label: "포지션 상세 튜토리얼",
    shortLabel: "Position",
    steps: [
      {
        title: "포지션 상세는 한 종목의 생애주기를 보는 화면입니다.",
        body: "첫 진입부터 추가 매수, 부분 익절, 종료까지 한 흐름으로 읽을 수 있습니다."
      },
      {
        title: "차트 위에서 실제 이벤트를 확인합니다.",
        body: "매수·익절·손절 이벤트가 차트 위 마커로 표시되어 실제 행동 흐름이 바로 보입니다."
      },
      {
        title: "계획과 실제를 비교합니다.",
        body: "처음 계획한 손절과 목표, 실제 체결 결과를 비교해 어떤 차이가 있었는지 확인합니다."
      },
      {
        title: "마지막에는 회고로 남깁니다.",
        body: "잘한 점, 아쉬운 점, 다음 규칙을 남기면 이후 Today와 Opening Check에도 다시 반영됩니다."
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
        body: "실제 자산 편집은 Portfolio에서 하고, 여기서는 계정 상태와 세션만 가볍게 봅니다."
      },
      {
        title: "튜토리얼은 언제든 다시 볼 수 있습니다.",
        body: "처음 한 번만 자동으로 뜨고, 이후에는 여기서 다시 보거나 초기화할 수 있게 됩니다."
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

  if (pathname === "/signals" || pathname === "/ranking" || pathname === "/tracking") {
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
