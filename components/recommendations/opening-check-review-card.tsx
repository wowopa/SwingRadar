import { Radar, ShieldCheck, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeActionLanguage } from "@/lib/copy/action-language";
import type { OpeningRecheckReviewDto } from "@/lib/api-contracts/swing-radar";

function formatPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "기록 누적 중";
  }

  return `${value.toFixed(0)}%`;
}

export function OpeningCheckReviewCard({ review }: { review?: OpeningRecheckReviewDto }) {
  if (!review) {
    return (
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/70">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">장초 확인 회고</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                장초 확인 결과가 조금 더 쌓이면 통과와 보류 판단이 실제 성과와 어떻게 연결되는지 보여줍니다.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/70">
                <Radar className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">장초 확인 회고</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{normalizeActionLanguage(review.summary.note)}</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary">{review.summary.headline}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">매칭 완료</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{review.summary.matchedCount}건</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">장초 확인과 관찰 결과가 함께 남은 종목</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">결과 확정</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{review.summary.resolvedCount}건</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">성공 또는 실패/무효화로 끝난 종목</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">통과 승률</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(review.summary.passedWinRate)}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">장초 확인을 통과시킨 종목의 확정 성과</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">피한 종목 위험 적중</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatPercent(review.summary.avoidedFailureRate)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">추격 금지 또는 제외 종목의 실제 실패 비율</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">상태별 회고</p>
            </div>
            <div className="mt-4 space-y-3">
              {review.statusBreakdown.map((item) => (
                <div key={item.status} className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.label}</Badge>
                      <span className="text-sm font-semibold text-foreground">{item.count}건</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      결과 확정 {item.resolvedCount} · 성공 {item.successCount} · 실패 {item.failureCount}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">자주 나온 체크 조합</p>
            </div>
            {review.patterns.length ? (
              <div className="mt-4 space-y-3">
                {review.patterns.map((pattern) => (
                  <div key={pattern.id} className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{pattern.title}</p>
                      <Badge variant="secondary">{pattern.count}건</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{pattern.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-border/70 bg-background/80 px-4 py-5 text-sm text-muted-foreground">
                아직 체크 조합이 충분히 쌓이지 않아 대표 패턴을 보여주기 어렵습니다.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
