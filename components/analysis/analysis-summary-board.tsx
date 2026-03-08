import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisSummaryMetric } from "@/types/analysis";

export function AnalysisSummaryBoard({ items }: { items: AnalysisSummaryMetric[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-h-[148px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xl font-semibold tracking-tight text-foreground">{item.value}</p>
            <p className="text-sm leading-7 text-muted-foreground">{item.note}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
