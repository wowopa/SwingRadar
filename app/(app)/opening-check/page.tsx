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
  searchParams?: Promise<{ ticker?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tickerParam = Array.isArray(resolvedSearchParams.ticker)
    ? resolvedSearchParams.ticker[0]
    : resolvedSearchParams.ticker;
  const initialFocusTicker =
    typeof tickerParam === "string" ? tickerParam.toUpperCase() : null;
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Today"
        title="장초 확인"
        description="서비스 공통 후보 중 오늘 먼저 볼 종목만 다시 확인하는 단계입니다. 갭, 확인 가격 반응, 오늘 행동을 체크하고 실제 매수 검토 후보를 좁힙니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <section className="grid gap-3 rounded-[28px] border border-border/70 bg-card/45 p-5 md:grid-cols-3">
        <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">1. 공통 후보</p>
          <p className="mt-2 text-sm font-semibold text-foreground">모두가 같은 공통 후보를 먼저 봅니다.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            이 단계는 아직 실제 매수 지시가 아니라, 오늘 장초에 다시 확인할 서비스 공통 후보 목록입니다.
          </p>
        </div>
        <div className="rounded-[22px] border border-primary/25 bg-primary/8 p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-primary">2. 장초 확인</p>
          <p className="mt-2 text-sm font-semibold text-foreground">갭, 확인 가격 반응, 오늘 행동만 빠르게 체크합니다.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            세 가지 체크를 마치면 시스템이 통과, 관찰 유지, 보류 상태를 먼저 제안합니다.
          </p>
        </div>
        <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">3. 내 오늘 행동</p>
          <p className="mt-2 text-sm font-semibold text-foreground">통과한 종목만 Today의 실제 매수 검토로 넘어갑니다.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            그 뒤 실제 체결과 보유 관리는 Portfolio에서 이어지고, 공용 복기는 Signals에서 따로 봅니다.
          </p>
        </div>
      </section>

      <DailyCandidatesPanel dailyScan={response.dailyScan} initialFocusTicker={initialFocusTicker} />
    </main>
  );
}
