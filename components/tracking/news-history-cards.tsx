import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrackingNewsCard } from "@/types/tracking";

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

export function NewsHistoryCards({ items }: { items: TrackingNewsCard[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>이벤트 히스토리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <span>{item.date}</span>
                  <span className="rounded-full border border-border/80 px-2 py-1 normal-case tracking-normal">{item.source}</span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 normal-case tracking-normal">
                    {formatEventType(item.eventType)}
                  </span>
                </div>
                <p className="mt-1 font-medium text-white">{item.headline}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
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
              <SignalToneBadge tone={item.impact} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
