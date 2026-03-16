import Link from "next/link";

import type { DailyScanSummaryDto } from "@/lib/api-contracts/swing-radar";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTurnover(value?: number | null) {
  if (!value || value <= 0) {
    return "확인 필요";
  }

  const eok = value / 100_000_000;
  return `${eok.toFixed(eok >= 100 ? 0 : 1)}억`;
}

export function DailyCandidatesPanel({ dailyScan }: { dailyScan: DailyScanSummaryDto | null }) {
  if (!dailyScan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>오늘의 후보</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">아직 유니버스 스캔 결과가 없습니다. 배치 스캔이 실행되면 이 영역에 오늘의 후보가 자동 반영됩니다.</p>
        </CardContent>
      </Card>
    );
  }

  const hasCandidates = dailyScan.topCandidates.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>오늘의 후보</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            최신 유니버스 스캔 기준 상위 후보입니다. 생성 시각 {formatGeneratedAt(dailyScan.generatedAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
          배치 {dailyScan.succeededBatches}/{dailyScan.totalBatches} 성공
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCandidates ? (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              {dailyScan.topCandidates.slice(0, 6).map((item, index) => (
                <Link
                  key={`${item.ticker}-${index}`}
                  href={`/analysis/${item.ticker}`}
                  className="rounded-2xl border border-border/70 bg-secondary/35 p-4 transition hover:border-primary/40 hover:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.ticker} · {item.sector}
                      </p>
                    </div>
                    <SignalToneBadge tone={item.signalTone} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border/70 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">랭킹 점수</p>
                      <p className="mt-1 font-semibold text-foreground">{item.candidateScore}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">유동성</p>
                      <p className="mt-1 font-semibold text-foreground">{item.liquidityRating ?? formatTurnover(item.averageTurnover20)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground line-clamp-3">{item.rationale}</p>
                </Link>
              ))}
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
              총 {dailyScan.totalTickers}개 종목 중 상위 {dailyScan.topCandidates.length}개 후보를 자동 정렬했습니다.{" "}
              <Link className="font-medium text-primary hover:text-primary/80" href="/ranking">
                전체 랭킹 보기
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-caution/30 bg-caution/10 p-4 text-sm text-caution">
            아직 후보가 생성되지 않았습니다. 성공한 배치가 없거나 외부 데이터 수집이 실패했습니다.
          </div>
        )}

        {dailyScan.failedBatches.length ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            실패 배치 {dailyScan.failedBatches.length}건이 기록되었습니다.
            <div className="mt-3 space-y-2 text-xs text-destructive/90">
              {dailyScan.failedBatches.slice(0, 3).map((batch) => (
                <p key={batch.batch}>배치 {batch.batch}: {batch.errors[0] ?? "원인 미상"}</p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
