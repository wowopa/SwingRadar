import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsImpactItem } from "@/types/analysis";

function summarize(items: NewsImpactItem[]) {
  let disclosure = 0;
  let curated = 0;
  let externalNews = 0;

  for (const item of items) {
    if (item.eventType === "curated-news") {
      curated += 1;
      continue;
    }

    if (
      item.source === "dart" ||
      [
        "earnings",
        "treasury-stock",
        "contract",
        "clinical-approval",
        "capital-raise",
        "risk",
        "inquiry",
        "governance",
        "general-disclosure"
      ].includes(item.eventType)
    ) {
      disclosure += 1;
      continue;
    }

    externalNews += 1;
  }

  const confidence =
    disclosure + curated >= 2
      ? "보강됨"
      : disclosure + curated >= 1 || items.length >= 2
        ? "제한적"
        : "취약";

  const note =
    items.length === 0
      ? "기사 수집이 비어 있어 이벤트 점수 해석을 보수적으로 봐야 합니다."
      : externalNews === 0 && disclosure + curated > 0
        ? "절대 기사 수는 적지만 공시/큐레이션 이벤트로 커버리지를 보강한 상태입니다."
        : disclosure + curated > 0
          ? "외부 기사와 공시/큐레이션 커버리지를 함께 해석합니다."
          : "외부 기사 커버리지가 중심인 상태이므로 가격/무효화 기준과 함께 보수적으로 해석합니다.";

  return { disclosure, curated, externalNews, confidence, note };
}

export function EventCoveragePanel({ items }: { items: NewsImpactItem[] }) {
  const coverage = summarize(items);

  return (
    <Card>
      <CardHeader>
        <CardTitle>이벤트 커버리지</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">신뢰도</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{coverage.confidence}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">공시</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{coverage.disclosure}건</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">큐레이션</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{coverage.curated}건</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">외부 기사</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{coverage.externalNews}건</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{coverage.note}</p>
      </CardContent>
    </Card>
  );
}
