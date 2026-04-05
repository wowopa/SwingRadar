import { Compass, LayoutGrid, PlayCircle, WalletCards } from "lucide-react";

import { TutorialLauncherButton } from "@/components/tutorial/tutorial-launcher-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppTutorialScope } from "@/lib/tutorial/app-tutorial-content";

const guideItems: Array<{
  scope: AppTutorialScope;
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutGrid;
}> = [
  {
    scope: "today",
    href: "/recommendations",
    label: "Today 가이드",
    description: "오늘 먼저 볼 일, 매수 검토, 보유 관리 루프를 다시 훑습니다.",
    icon: LayoutGrid
  },
  {
    scope: "opening-check",
    href: "/opening-check",
    label: "Opening Check 가이드",
    description: "장초 5~10분 확인 흐름과 제안 상태 해석을 다시 봅니다.",
    icon: PlayCircle
  },
  {
    scope: "signals",
    href: "/signals",
    label: "Signals 가이드",
    description: "공통 후보, 신뢰도, 개인 기준 해석을 다시 읽습니다.",
    icon: Compass
  },
  {
    scope: "portfolio",
    href: "/portfolio",
    label: "Portfolio 가이드",
    description: "보유, 기록, 복기, 규칙 관리 흐름을 다시 확인합니다.",
    icon: WalletCards
  }
];

export function AccountGuideLibraryCard() {
  return (
    <div data-tutorial="account-tutorial">
      <Card data-tutorial="account-guides" className="border-border/70 bg-card/92 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>가이드 라이브러리</CardTitle>
            <Badge variant="secondary">튜토리얼 재진입</Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            현재 화면만 다시 보는 버튼이 아니라, 자주 쓰는 주요 화면의 튜토리얼로 바로 다시 들어갈 수 있습니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {guideItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.scope} className="rounded-[24px] border border-border/70 bg-background/85 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      <div className="mt-3">
                        <TutorialLauncherButton scope={item.scope} href={item.href} label={item.label} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <TutorialLauncherButton scope="account" label="현재 Account 가이드" />
            <TutorialLauncherButton label="전체 튜토리얼 다시 보기" resetAll />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
