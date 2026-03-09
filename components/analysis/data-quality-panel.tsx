import type { DataQualityItem } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getValueTone(item: DataQualityItem) {
  if (item.value.includes("참고 계산") || item.value.includes("취약")) {
    return "text-amber-700";
  }

  if (item.value.includes("실측 기반") || item.value.includes("보강됨")) {
    return "text-emerald-700";
  }

  return "text-primary";
}

export function DataQualityPanel({ items }: { items: DataQualityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터 품질</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-[28px] border border-border/70 bg-secondary/35 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium text-foreground">{item.label}</p>
              <p className={`text-sm font-semibold ${getValueTone(item)}`}>{item.value}</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
