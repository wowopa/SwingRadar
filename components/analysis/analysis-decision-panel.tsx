import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeyLevel } from "@/types/analysis";

export function AnalysisDecisionPanel({ levels, notes }: { levels: KeyLevel[]; notes: string[] }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>핵심 가격 레벨</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {levels.map((level) => (
            <div key={level.label} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-white">{level.label}</p>
                <p className="text-sm font-semibold text-primary">{level.price}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{level.meaning}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>판단 메모</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes.map((note) => (
            <div key={note} className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm leading-6 text-slate-200">
              {note}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}