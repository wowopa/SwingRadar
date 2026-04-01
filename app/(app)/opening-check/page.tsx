import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function OpeningCheckPage({
  searchParams
}: {
  searchParams?: Promise<{ ticker?: string }> | { ticker?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const initialFocusTicker =
    typeof resolvedSearchParams.ticker === "string" ? resolvedSearchParams.ticker.toUpperCase() : null;
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Opening Check"
        title="장초 확인"
        description="오늘 먼저 볼 종목을 하나씩 확인해 오늘 매수 검토, 조금 더 관찰, 보류로 정리하는 전용 화면입니다. 아침 루틴은 이 화면에서 시작하면 됩니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <section className="grid gap-3 rounded-[28px] border border-border/70 bg-card/45 p-5 md:grid-cols-3">
        <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">1. 오늘 먼저 볼 종목</p>
          <p className="mt-2 text-sm font-semibold text-foreground">장전 계획 기준으로 종목을 좁힙니다.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">여기서는 아직 매수하지 않고, 장 시작 직후 다시 확인할 목록만 만듭니다.</p>
        </div>
        <div className="rounded-[22px] border border-primary/25 bg-primary/8 p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-primary">2. 장초 확인</p>
          <p className="mt-2 text-sm font-semibold text-foreground">갭, 확인 가격 반응, 오늘 행동을 체크합니다.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">체크 3가지만 고르면 시스템이 통과, 관찰, 보류를 먼저 제안합니다.</p>
        </div>
        <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">3. 오늘 행동</p>
          <p className="mt-2 text-sm font-semibold text-foreground">통과한 종목만 매수 검토로 넘어갑니다.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">남은 종목은 관찰 또는 보류로 남기고, 실제 포지션 관리는 Portfolio에서 이어갑니다.</p>
        </div>
      </section>

      <DailyCandidatesPanel dailyScan={response.dailyScan} initialFocusTicker={initialFocusTicker} />
    </main>
  );
}
