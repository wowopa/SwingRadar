import { formatPercent } from "@/lib/utils";
import type { ScoreLogEntry } from "@/types/tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ScoreLogPanel({ items }: { items: ScoreLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>점수 계산 로그</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={`${item.timestamp}-${item.factor}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-white">{item.factor}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.timestamp}</p>
              </div>
              <p className={item.delta >= 0 ? "font-semibold text-positive" : "font-semibold text-caution"}>
                {formatPercent(item.delta)}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
