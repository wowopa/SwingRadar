import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeActionLanguage } from "@/lib/copy/action-language";
import { formatScore } from "@/lib/utils";
import type { ScoreLogEntry } from "@/types/tracking";

function formatPointDelta(value: number) {
  const magnitude = `${formatScore(Math.abs(value))}점`;

  if (value > 0) {
    return `+${magnitude}`;
  }
  if (value < 0) {
    return `-${magnitude}`;
  }
  return magnitude;
}

function getDeltaTone(value: number) {
  if (value > 0) {
    return "text-positive";
  }
  if (value < 0) {
    return "text-caution";
  }
  return "text-muted-foreground";
}

export function ScoreLogPanel({ items }: { items: ScoreLogEntry[] }) {
  const positiveTotal = items.reduce((sum, item) => sum + Math.max(item.delta, 0), 0);
  const negativeTotal = items.reduce((sum, item) => sum + Math.min(item.delta, 0), 0);
  const finalScore = items.at(-1)?.scoreAfter ?? items.reduce((sum, item) => sum + item.delta, 0);
  const chaseGuardEntry = items.find((item) => item.factor === "추격 억제");

  return (
    <Card>
      <CardHeader>
        <CardTitle>관찰 점수 계산 로그</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">관찰 점수의 가산·감산 흐름과 단기 급등 추격 억제 판단을 함께 보여줍니다.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="최종 점수" value={`${formatScore(finalScore)}점`} tone="text-foreground" />
            <SummaryCard label="가산 합계" value={`+${formatScore(positiveTotal)}점`} tone="text-positive" />
            <SummaryCard label="감산 합계" value={`-${formatScore(Math.abs(negativeTotal))}점`} tone="text-caution" />
          </div>
        ) : null}
        {chaseGuardEntry ? (
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">추격 억제:</span> {normalizeActionLanguage(chaseGuardEntry.reason)}
          </div>
        ) : null}
        {items.length ? (
          items.map((item) => (
            <div key={`${item.timestamp}-${item.factor}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.factor}</p>
                    {typeof item.scoreAfter === "number" ? (
                      <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                        누적 {formatScore(item.scoreAfter)}점
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.timestamp}</p>
                </div>
                <p className={`font-semibold ${getDeltaTone(item.delta)}`}>{formatPointDelta(item.delta)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{normalizeActionLanguage(item.reason)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-6 text-sm leading-6 text-muted-foreground">
            아직 기록된 점수 로그가 없습니다. 다음 스냅샷부터 계산 단계가 채워집니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
