import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsImpactItem } from "@/types/analysis";

function formatEventType(eventType: string) {
  const labels: Record<string, string> = {
    news: "뉴스",
    "curated-news": "운영자 큐레이션",
    earnings: "실적 공시",
    "treasury-stock": "자사주",
    contract: "계약/수주",
    "clinical-approval": "임상/허가",
    "capital-raise": "자본조달",
    risk: "리스크 공시",
    inquiry: "조회공시",
    governance: "지배구조",
    "general-disclosure": "일반 공시"
  };

  return labels[eventType] ?? eventType;
}

export function NewsImpactList({ items }: { items: NewsImpactItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>외부 이벤트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={`${item.date}-${item.headline}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{item.date}</span>
                  <span className="rounded-full border border-border/80 px-2 py-1 normal-case tracking-normal">{item.source}</span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 normal-case tracking-normal">
                    {formatEventType(item.eventType)}
                  </span>
                </div>
                <p className="font-medium text-foreground">{item.headline}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  >
                    원문 보기
                  </a>
                ) : null}
              </div>
              <div className="shrink-0 pt-0.5">
                <SignalToneBadge tone={item.impact} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
