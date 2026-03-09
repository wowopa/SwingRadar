import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreBreakdownItem } from "@/types/analysis";

export function ScoreBreakdown({ items }: { items: ScoreBreakdownItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>점수 분해</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-[28px] border border-border/70 bg-secondary/35 p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
              <p className="text-lg font-semibold text-primary">{item.score}</p>
            </div>
            <Progress value={Math.min(item.score * 4, 100)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
