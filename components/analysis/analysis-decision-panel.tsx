import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeyLevel } from "@/types/analysis";

function getDisplayLabel(label: string) {
  if (label.includes("진입") || label.includes("확인")) {
    return "진입 기준";
  }

  if (label.includes("목표") || label.includes("다음")) {
    return "목표 가격";
  }

  return "위험 가격";
}

function parseLevelPrice(price: string) {
  const normalized = price.replace(/[^0-9.-]/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function AnalysisDecisionPanel({ levels, notes }: { levels: KeyLevel[]; notes: string[] }) {
  const entryLevel = levels.find((level) => labelIncludesEntry(level.label));
  const entryPrice = entryLevel ? parseLevelPrice(entryLevel.price) : null;

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader>
        <CardTitle>핵심 가격 레벨</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {levels.map((level) => (
            <div key={`${level.label}-${level.price}`} className="rounded-[28px] border border-border/70 bg-secondary/35 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-foreground">{getDisplayLabel(level.label)}</p>
                <p className="text-sm font-semibold text-primary">{getLevelDisplayPrice(level, entryPrice)}</p>
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
            <div key={note} className="rounded-[28px] border border-border/70 bg-secondary/35 px-5 py-4 text-sm leading-7 text-foreground/82">
              {note}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function labelIncludesEntry(label: string) {
  return label.includes("진입") || label.includes("확인");
}

function labelIncludesTarget(label: string) {
  return label.includes("목표") || label.includes("다음");
}

function getLevelDisplayPrice(level: KeyLevel, entryPrice: number | null) {
  if (!entryPrice || level.price.includes("%")) {
    return level.price;
  }

  const levelPrice = parseLevelPrice(level.price);
  if (!levelPrice) {
    return level.price;
  }

  if (labelIncludesTarget(level.label) || (!labelIncludesEntry(level.label) && !level.label.includes("위험") && !level.label.includes("이탈"))) {
    const change = ((levelPrice - entryPrice) / entryPrice) * 100;
    return `${level.price} (${formatSignedPercent(change)})`;
  }

  if (level.label.includes("위험") || level.label.includes("이탈")) {
    const change = ((levelPrice - entryPrice) / entryPrice) * 100;
    return `${level.price} (${formatSignedPercent(change)})`;
  }

  return level.price;
}
