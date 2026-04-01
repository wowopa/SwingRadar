import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";

export const dynamic = "force-dynamic";

function getOpeningCheckLimit() {
  const parsed = Number(process.env.SWING_RADAR_OPENING_CHECK_LIMIT ?? 5);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
}

export default async function SignalsPage() {
  const [recommendations, dailyCandidates, tracking] = await Promise.all([
    getRecommendations(),
    getDailyCandidates(),
    getTrackingPayload()
  ]);

  const candidateCount = dailyCandidates?.topCandidates.length ?? recommendations.items.length;
  const openingCheckCount = Math.min(candidateCount, getOpeningCheckLimit());
  const statusSummaries = [
    buildPublicDataStatusSummary(
      dailyCandidates ? "daily-candidates" : "recommendations",
      dailyCandidates?.generatedAt ?? recommendations.generatedAt
    ),
    buildPublicDataStatusSummary("tracking", tracking.generatedAt)
  ];

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Signals"
        title="서비스 공통 후보와 복기"
        description="이 화면은 모두가 함께 보는 공통 레이어입니다. 오늘 서비스가 좋게 보는 후보와 공용 추적 결과를 보고, 실제 내 행동은 Today와 Portfolio에서 따로 이어갑니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="공통 후보"
          value={`${candidateCount}개`}
          note="서비스가 오늘 우선순위로 보고 있는 공통 후보 수입니다. 이 목록은 사용자마다 달라지지 않습니다."
        />
        <SummaryCard
          title="장초 확인 기준"
          value={`${openingCheckCount}개`}
          note="Today에서 먼저 확인하는 상위 후보 수입니다. 실제 실행 여부는 내 계좌 기준으로 다시 갈립니다."
        />
        <SummaryCard
          title="공용 추적 이력"
          value={`${tracking.history.length}건`}
          note="과거 공용 추적 결과를 복기하는 데이터입니다. 오늘 행동 화면이 아니라 학습용 이력입니다."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <SignalEntryCard
          href="/ranking"
          title="오늘 공통 후보 보기"
          description="순위표 중심으로 오늘 서비스가 좋게 보는 종목을 비교합니다. 모두가 같은 후보를 봅니다."
          meta={`${candidateCount}개 후보`}
        />
        <SignalEntryCard
          href="/tracking"
          title="공용 추적 복기"
          description="성공과 실패, 점수 로그, 사후 메모를 다시 보면서 공통 판단이 어떻게 끝났는지 복기합니다."
          meta={`${tracking.history.length}건 이력`}
        />
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">개인 행동은 따로 봅니다</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Today에서는 공통 후보를 바탕으로 내 계좌 기준 오늘 확인 대상과 실제 매수 검토 종목만 남깁니다.</p>
            <p>Portfolio에서는 내 자산, 보유 종목, 체결 기록, 다음 행동을 계속 관리합니다.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/recommendations"
                className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/12"
              >
                Today 보기
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/25"
              >
                Portfolio 보기
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SummaryCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function SignalEntryCard({
  href,
  title,
  description,
  meta
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full border-border/70 bg-white/82 shadow-sm transition hover:border-primary/25 hover:bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            <span className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              {meta}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
