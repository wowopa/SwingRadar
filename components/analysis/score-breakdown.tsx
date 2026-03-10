import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScoreBreakdownItem } from "@/types/analysis";

function getScoreStatus(score: number) {
  if (score >= 18) {
    return {
      label: "좋음",
      description: "지금 구조에서 비교적 강한 편입니다.",
      tone: "bg-emerald-100 text-emerald-700"
    };
  }

  if (score >= 10) {
    return {
      label: "보통",
      description: "좋고 나쁨이 섞여 있어 추가 확인이 필요합니다.",
      tone: "bg-amber-100 text-amber-700"
    };
  }

  return {
    label: "주의",
    description: "현재 점수만 보면 강한 근거로 보기 어렵습니다.",
    tone: "bg-rose-100 text-rose-700"
  };
}

export function ScoreBreakdown({ items }: { items: ScoreBreakdownItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>점수 해석</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const status = getScoreStatus(item.score);

          return (
            <div key={item.label} className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
                <p className="shrink-0 text-lg font-semibold text-foreground">{item.score}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", status.tone)}>{status.label}</span>
                <p className="text-xs leading-5 text-foreground/70">{status.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
