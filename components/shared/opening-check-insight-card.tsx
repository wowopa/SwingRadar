import { Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeActionLanguage } from "@/lib/copy/action-language";
import type { OpeningRecheckTickerInsight } from "@/types/recommendation";

export function OpeningCheckInsightCard({
  insight,
  emptyMessage
}: {
  insight?: OpeningRecheckTickerInsight | null;
  emptyMessage?: string;
}) {
  if (!insight) {
    return (
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/70">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">장초 확인 기록</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyMessage ?? "이 종목과 연결된 장초 확인 기록이 아직 없습니다."}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/70">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">장초 확인 기록</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {insight.signalDate} 기준 장초 확인 · {insight.matchedBy === "signal_date" ? "같은 날짜 매칭" : "최근 기록 매칭"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{insight.statusLabel}</Badge>
            {insight.outcomeLabel ? <Badge variant="secondary">{insight.outcomeLabel}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[20px] border border-border/70 bg-secondary/20 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">{insight.statusDescription}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{normalizeActionLanguage(insight.outcomeNote)}</p>
        </div>

        {(insight.gapLabel || insight.confirmationLabel || insight.actionLabel) ? (
          <div className="flex flex-wrap gap-2">
            {insight.gapLabel ? <Badge variant="secondary">{insight.gapLabel}</Badge> : null}
            {insight.confirmationLabel ? <Badge variant="secondary">{insight.confirmationLabel}</Badge> : null}
            {insight.actionLabel ? <Badge variant="secondary">{insight.actionLabel}</Badge> : null}
          </div>
        ) : null}

        {insight.note ? (
          <div className="rounded-[20px] border border-border/70 bg-background/80 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">기록 메모</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{normalizeActionLanguage(insight.note)}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
