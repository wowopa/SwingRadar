import type { ReactNode } from "react";
import { Expand, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { HistoricalSnapshotPoint } from "@/types/tracking";
import { cn, formatPercent } from "@/lib/utils";

type ChartMeta = {
  start: number;
  end: number;
  min: number;
  max: number;
  highPoint: HistoricalSnapshotPoint;
  lowPoint: HistoricalSnapshotPoint;
  endChangePercent: number;
  runupPercent: number;
  drawdownPercent: number;
};

type ChartPoint = HistoricalSnapshotPoint & {
  x: number;
  y: number;
  changePercent: number;
};

function buildChartMeta(points: HistoricalSnapshotPoint[]): ChartMeta {
  const firstPoint = points[0];
  const start = firstPoint?.price ?? 0;
  const end = points.at(-1)?.price ?? start;
  const highPoint = points.reduce((highest, point) => (point.price > highest.price ? point : highest), firstPoint);
  const lowPoint = points.reduce((lowest, point) => (point.price < lowest.price ? point : lowest), firstPoint);
  const min = Math.min(...points.map((point) => point.price));
  const max = Math.max(...points.map((point) => point.price));
  const endChangePercent = start > 0 ? ((end - start) / start) * 100 : 0;
  const runupPercent = start > 0 ? ((highPoint.price - start) / start) * 100 : 0;
  const drawdownPercent = start > 0 ? ((lowPoint.price - start) / start) * 100 : 0;

  return {
    start,
    end,
    min,
    max,
    highPoint,
    lowPoint,
    endChangePercent,
    runupPercent,
    drawdownPercent
  };
}

function buildChartPoints(points: HistoricalSnapshotPoint[], meta: ChartMeta): ChartPoint[] {
  const range = Math.max(meta.max - meta.min, 1);

  return points.map((point, index) => {
    const x = 36 + (index / Math.max(points.length - 1, 1)) * 728;
    const y = 184 - ((point.price - meta.min) / range) * 132;
    const changePercent = meta.start > 0 ? ((point.price - meta.start) / meta.start) * 100 : 0;

    return {
      ...point,
      x,
      y,
      changePercent
    };
  });
}

function formatPrice(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function getToneClass(value: number) {
  if (value > 0) {
    return "text-emerald-700";
  }
  if (value < 0) {
    return "text-rose-700";
  }
  return "text-slate-600";
}

function describeTrend(meta: ChartMeta) {
  if (meta.endChangePercent >= 8) {
    return "진입가보다 꽤 높은 자리에서 마감했습니다.";
  }
  if (meta.endChangePercent >= 2) {
    return "진입가보다 높은 자리에서 흐름을 유지했습니다.";
  }
  if (meta.endChangePercent <= -8) {
    return "진입가보다 크게 밀린 상태라 흐름 점검이 필요합니다.";
  }
  if (meta.endChangePercent <= -2) {
    return "진입가보다 약한 자리에서 마감했습니다.";
  }
  return "진입가 부근에서 방향을 다시 확인하는 흐름입니다.";
}

function describeVolatility(meta: ChartMeta) {
  const swingWidth = meta.start > 0 ? ((meta.max - meta.min) / meta.start) * 100 : 0;

  if (swingWidth >= 18) {
    return "중간 흔들림이 큰 편이라 눌림과 반등 폭을 함께 봐야 합니다.";
  }
  if (swingWidth >= 8) {
    return "흔들림은 있었지만 스윙 관점에서 해석 가능한 범위입니다.";
  }
  return "가격 흔들림이 비교적 제한적입니다.";
}

export function ChartSnapshot({ points }: { points: HistoricalSnapshotPoint[] }) {
  if (!points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>가격 흐름 해석</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">표시할 가격 기록이 아직 없습니다.</CardContent>
      </Card>
    );
  }

  const meta = buildChartMeta(points);
  const chartPoints = buildChartPoints(points, meta);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>가격 흐름 해석</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            진입가를 기준선으로 두고, 어디까지 올랐는지, 어디서 가장 크게 밀렸는지, 마지막 가격이 어느 쪽에 있는지 한 번에 읽을 수 있게 정리했습니다.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Expand className="h-4 w-4" />
              확대 보기
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>가격 흐름 상세 보기</DialogTitle>
              <DialogDescription>진입가 기준선과 최고점, 최저점, 마지막 가격 위치를 함께 확인합니다.</DialogDescription>
            </DialogHeader>
            <SnapshotBody meta={meta} chartPoints={chartPoints} large />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <SnapshotBody meta={meta} chartPoints={chartPoints} />
      </CardContent>
    </Card>
  );
}

function SnapshotBody({
  meta,
  chartPoints,
  large = false
}: {
  meta: ChartMeta;
  chartPoints: ChartPoint[];
  large?: boolean;
}) {
  const baselineY = chartPoints[0]?.y ?? 132;
  const lastPoint = chartPoints.at(-1);
  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryBox label="진입가" value={formatPrice(meta.start)} tone="text-foreground" />
        <SummaryBox label="현재 위치" value={`${formatPrice(meta.end)} · ${formatPercent(meta.endChangePercent)}`} tone={getToneClass(meta.endChangePercent)} />
        <SummaryBox label="가장 높았던 구간" value={`${meta.highPoint.label} · ${formatPrice(meta.highPoint.price)}`} tone="text-emerald-700" />
        <SummaryBox label="가장 밀린 구간" value={`${meta.lowPoint.label} · ${formatPrice(meta.lowPoint.price)}`} tone="text-rose-700" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background/55 p-4">
        <svg viewBox="0 0 800 220" className={cn("w-full", large ? "h-[360px]" : "h-[250px]")}>
          <line x1="36" y1={baselineY} x2="764" y2={baselineY} stroke="rgba(100,116,139,0.35)" strokeDasharray="7 7" />
          <text x="36" y={Math.max(baselineY - 10, 18)} fill="#64748b" fontSize="11">
            진입가 기준
          </text>

          <polyline
            fill="none"
            points={polylinePoints}
            stroke="#218069"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />

          {chartPoints.map((point) => {
            const isHigh = point.label === meta.highPoint.label;
            const isLow = point.label === meta.lowPoint.label;
            const isLast = point.label === lastPoint?.label;
            const tone = isHigh ? "#059669" : isLow ? "#e11d48" : isLast ? "#0f766e" : "#218069";

            return (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r={isHigh || isLow || isLast ? 5 : 3.5} fill={tone} />
                <text x={point.x} y="208" textAnchor="middle" fill="#64748b" fontSize="11">
                  {point.label}
                </text>
                {(isHigh || isLow || isLast) && (
                  <>
                    <text x={point.x} y={point.y - 14} textAnchor="middle" fill={tone} fontSize="11" fontWeight="600">
                      {isHigh ? "최고" : isLow ? "최저" : "마감"}
                    </text>
                    <text x={point.x} y={point.y + 18} textAnchor="middle" fill="#475569" fontSize="11">
                      {formatPercent(point.changePercent)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <InterpretBox
          icon={<TrendingUp className="h-4 w-4" />}
          title="전체 흐름"
          tone={meta.endChangePercent >= 0 ? "emerald" : "rose"}
          body={describeTrend(meta)}
        />
        <InterpretBox
          icon={<TrendingDown className="h-4 w-4" />}
          title="중간 흔들림"
          tone={meta.drawdownPercent <= -5 ? "amber" : "emerald"}
          body={`${describeVolatility(meta)} 최저 구간은 ${meta.lowPoint.label}, 진입가 대비 ${formatPercent(meta.drawdownPercent)}였습니다.`}
        />
        <InterpretBox
          icon={<TrendingUp className="h-4 w-4" />}
          title="강했던 구간"
          tone="emerald"
          body={`${meta.highPoint.label}에 가장 강했고, 진입가 대비 ${formatPercent(meta.runupPercent)}까지 올라갔습니다.`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {chartPoints.map((point) => (
          <div key={point.label} className="rounded-[20px] border border-border/70 bg-secondary/35 p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">{point.label}</p>
            <p className="mt-2 text-base font-semibold text-foreground">{formatPrice(point.price)}</p>
            <p className={cn("mt-1 text-xs font-medium", getToneClass(point.changePercent))}>{formatPercent(point.changePercent)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-base font-semibold", tone)}>{value}</p>
    </div>
  );
}

function InterpretBox({
  icon,
  title,
  body,
  tone
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full p-1.5", toneClass)}>{icon}</span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground/75">{body}</p>
    </div>
  );
}
