import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataQualityItem } from "@/types/analysis";

function getValueTone(item: DataQualityItem) {
  if (item.value.includes("보수 계산") || item.value.includes("취약")) {
    return "text-rose-700";
  }

  if (
    item.value.includes("유사 흐름 참고") ||
    item.value.includes("제한적") ||
    item.value.includes("주의")
  ) {
    return "text-amber-700";
  }

  if (
    item.value.includes("유사 업종 참고") ||
    item.value.includes("기본 가격 이력") ||
    item.value.includes("안정적인 가격 이력") ||
    item.value.includes("보통")
  ) {
    return "text-sky-700";
  }

  if (
    item.value.includes("실측 기반") ||
    item.value.includes("공용 추적 참고") ||
    item.value.includes("양호") ||
    item.value.includes("보강됨") ||
    item.value.includes("풍부한 가격 이력")
  ) {
    return "text-emerald-700";
  }

  return "text-primary";
}

export function DataQualityPanel({ items }: { items: DataQualityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터 신뢰도</CardTitle>
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
