import Link from "next/link";

import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const initialFocusTicker = typeof tickerParam === "string" ? tickerParam.toUpperCase() : null;
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });

  if (!response.marketSession.isOpenDay) {
    return (
      <main className="pb-10">
        <Card className="border-border/80 bg-white/92 shadow-[0_22px_56px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow-label">Opening Check</span>
              <span className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1 text-xs font-medium text-foreground/78">
                {response.marketSession.closureLabel}
              </span>
            </div>
            <CardTitle className="text-2xl tracking-[-0.04em] text-foreground">
              {response.marketSession.headline}
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">{response.marketSession.detail}</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/signals?tab=candidates"
              className="inline-flex h-10 items-center rounded-full border border-primary/24 bg-primary/10 px-4 text-sm font-medium text-primary transition hover:bg-primary/14"
            >
              Signals에서 계획 보기
            </Link>
            <Link
              href="/portfolio"
              className="inline-flex h-10 items-center rounded-full border border-border/80 bg-white px-4 text-sm font-medium text-foreground/78 transition hover:border-primary/24 hover:text-primary"
            >
              Portfolio 복기하기
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="pb-10">
      <DailyCandidatesPanel
        dailyScan={response.dailyScan}
        openingCheckLearning={response.openingCheckLearning}
        openingCheckRiskPatterns={response.openingCheckRiskPatterns}
        personalRuleReminder={response.personalRuleReminder}
        initialFocusTicker={initialFocusTicker}
      />
    </main>
  );
}
