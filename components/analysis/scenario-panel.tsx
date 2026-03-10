import type { Scenario } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getScenarioStatus(probability: number) {
  if (probability >= 50) {
    return {
      label: "가장 유력",
      tone: "bg-emerald-100 text-emerald-700"
    };
  }

  if (probability >= 25) {
    return {
      label: "보조 시나리오",
      tone: "bg-amber-100 text-amber-700"
    };
  }

  return {
    label: "방어 확인",
    tone: "bg-slate-100 text-slate-700"
  };
}

export function ScenarioPanel({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>가능한 흐름</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((scenario) => {
          const status = getScenarioStatus(scenario.probability);

          return (
            <div key={scenario.label} className="rounded-[24px] border border-border/70 bg-secondary/35 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{scenario.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{scenario.probability}%</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", status.tone)}>{status.label}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground/82">{scenario.expectation}</p>
              <div className="mt-4 rounded-[18px] border border-border/60 bg-background/55 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">트리거</p>
                <p className="mt-2 text-sm leading-6 text-foreground/72">{scenario.trigger}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
