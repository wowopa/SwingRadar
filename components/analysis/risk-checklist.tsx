import type { RiskChecklistItem } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusClassMap: Record<RiskChecklistItem["status"], string> = {
  양호: "text-positive",
  "확인 필요": "text-neutral",
  주의: "text-caution"
};

export function RiskChecklist({ items }: { items: RiskChecklistItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>리스크 체크리스트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium text-foreground">{item.label}</p>
              <p className={`text-sm font-semibold ${statusClassMap[item.status]}`}>{item.status}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
