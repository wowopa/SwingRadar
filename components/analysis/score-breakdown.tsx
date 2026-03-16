import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScoreBreakdownItem } from "@/types/analysis";

const SCORE_MAX_BY_LABEL: Record<string, number> = {
  추세: 25,
  수급: 25,
  변동성: 20,
  품질: 15,
  기술: 12
};

function getScoreStatus(score: number, maxScore: number) {
  if (score < 0) {
    return {
      label: "주의",
      description: "현재 구조에서 감점이 발생한 항목입니다.",
      tone: "bg-rose-100 text-rose-700"
    };
  }

  const ratio = maxScore > 0 ? score / maxScore : 0;

  if (ratio >= 0.72) {
    return {
      label: "높음",
      description: "현재 구조에서 비교적 강하게 유지되는 항목입니다.",
      tone: "bg-emerald-100 text-emerald-700"
    };
  }

  if (ratio >= 0.45) {
    return {
      label: "보통",
      description: "좋고 아쉬운 점이 함께 있어 추가 확인이 필요한 항목입니다.",
      tone: "bg-amber-100 text-amber-700"
    };
  }

  return {
    label: "주의",
    description: "현재 점수만 보면 강한 근거로 보기 어려운 항목입니다.",
    tone: "bg-rose-100 text-rose-700"
  };
}

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);
}

export function ScoreBreakdown({ items }: { items: ScoreBreakdownItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>점수 해석</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const maxScore = item.maxScore ?? SCORE_MAX_BY_LABEL[item.label] ?? 25;
          const status = getScoreStatus(item.score, maxScore);

          return (
            <div key={item.label} className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
                <p className="shrink-0 text-right text-lg font-semibold text-foreground">
                  {formatScore(item.score)} / {formatScore(maxScore)}
                </p>
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
