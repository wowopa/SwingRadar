import Link from "next/link";

import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { HoldingActionBoard } from "@/components/recommendations/holding-action-board";
import { TodayActionBoard } from "@/components/recommendations/today-action-board";
import { TodayOperatingSummary } from "@/components/recommendations/today-operating-summary";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main>
      <PageHeader
        eyebrow="Dashboard"
        title="오늘의 행동 대시보드"
        description="설명보다 행동을 먼저 보여주는 메인 화면입니다. 오늘 신규 매수 검토 종목, 장초 재판정 상태, 보유 관리 우선순위를 한 번에 확인합니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">오늘 먼저 확인할 것</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "오늘 신규 매수 최대 개수와 현재 보유 슬롯을 먼저 확인합니다.",
              "장초 재판정이 끝난 종목만 오늘 실제 행동 보드로 올립니다.",
              "보유 중 종목은 신규 후보와 섞지 않고 별도 보드에서 관리합니다."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm leading-6 text-foreground/82">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">빠른 이동</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Portfolio",
                description: "보유/관찰 관리 보기",
                href: "/tracking"
              },
              {
                title: "Explore",
                description: "전체 후보 탐색 보기",
                href: "/ranking"
              },
              {
                title: "Account",
                description: "자산과 보유 설정",
                href: "/account"
              }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-4 transition hover:border-primary/30 hover:bg-secondary/35"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {response.todayActionBoard ? (
        <section className="mb-6">
          <TodayActionBoard board={response.todayActionBoard} />
        </section>
      ) : null}

      {response.holdingActionBoard ? (
        <section className="mb-6">
          <HoldingActionBoard board={response.holdingActionBoard} />
        </section>
      ) : null}

      <section className="mb-6">
        <TodayOperatingSummary items={response.items} summary={response.todaySummary} workflow={response.operatingWorkflow} />
      </section>

      <section className="mb-6">
        <DailyCandidatesPanel dailyScan={response.dailyScan} />
      </section>
    </main>
  );
}
