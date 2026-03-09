import type { Scenario } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ScenarioPanel({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>시나리오</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <div key={scenario.label} className="rounded-[28px] border border-border/70 bg-secondary/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">{scenario.label}</p>
              <span className="text-sm text-primary">{scenario.probability}%</span>
            </div>
            <Progress className="mt-3" value={scenario.probability} />
            <p className="mt-4 text-sm leading-7 text-foreground/82">{scenario.expectation}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">트리거</p>
            <p className="mt-1 text-sm leading-6 text-foreground/72">{scenario.trigger}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
