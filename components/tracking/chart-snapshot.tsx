import { Expand } from "lucide-react";

import type { HistoricalSnapshotPoint } from "@/types/tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ChartSnapshot({ points }: { points: HistoricalSnapshotPoint[] }) {
  const min = Math.min(...points.map((point) => point.price));
  const max = Math.max(...points.map((point) => point.price));
  const range = Math.max(max - min, 1);
  const chartPoints = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point.price - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>히스토리컬 차트 스냅샷</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Expand className="h-4 w-4" />
              확대 보기
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>히스토리컬 차트 상세</DialogTitle>
              <DialogDescription>선택한 신호의 가격 경로를 더 넓은 뷰로 확인합니다.</DialogDescription>
            </DialogHeader>
            <SnapshotBody chartPoints={chartPoints} points={points} large />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <SnapshotBody chartPoints={chartPoints} points={points} />
      </CardContent>
    </Card>
  );
}

function SnapshotBody({
  chartPoints,
  points,
  large = false
}: {
  chartPoints: string;
  points: HistoricalSnapshotPoint[];
  large?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
        <svg viewBox="0 0 100 100" className={large ? "h-72 w-full" : "h-48 w-full"}>
          <polyline
            fill="none"
            points={chartPoints}
            stroke="rgb(51, 209, 255)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {points.map((point) => (
          <div key={point.label} className="rounded-xl border border-border/70 bg-secondary/35 p-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{point.label}</p>
            <p className="mt-2 text-sm font-semibold text-white">{point.price.toLocaleString()}원</p>
          </div>
        ))}
      </div>
    </div>
  );
}