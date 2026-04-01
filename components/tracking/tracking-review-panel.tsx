import { OpeningCheckInsightCard } from "@/components/shared/opening-check-insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeActionLanguage } from "@/lib/copy/action-language";
import type { TrackingDetail } from "@/types/tracking";

function getSelectionReason(detail: TrackingDetail) {
  return (
    normalizeActionLanguage(detail.selectionReason) ||
    "공용 관찰은 추천 톤보다 최근 상위권 반복 등장, 거래대금, 관찰 점수, 가격 구조 확인 기준을 함께 보고 선별합니다."
  );
}

function getSelectionHighlights(detail: TrackingDetail) {
  return (
    (detail.selectionHighlights?.map((item) => normalizeActionLanguage(item)) ?? [
      "추천 톤보다 반복 등장, 유동성, 가격 구조 확인 기준을 우선해 관찰 시작 여부를 판단합니다."
    ])
  );
}

export function TrackingReviewPanel({ detail }: { detail: TrackingDetail }) {
  const selectionStage = normalizeActionLanguage(detail.selectionStage) || "공용 관찰";
  const selectionReason = getSelectionReason(detail);
  const selectionHighlights = getSelectionHighlights(detail);

  return (
    <section className="space-y-6">
      <OpeningCheckInsightCard insight={detail.openingCheckInsight} />

      <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
        <CardHeader>
          <CardTitle>보게 된 이유</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] p-4">
            <p className="text-xs text-muted-foreground">현재 단계</p>
            <p className="mt-2 text-base font-semibold text-foreground">{selectionStage}</p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">{selectionReason}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {selectionHighlights.map((item) => (
              <div key={item} className="rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-3 text-sm leading-6 text-foreground/80">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader>
            <CardTitle>관찰 메모</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] p-4">
              <p className="text-xs text-muted-foreground">요약</p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{detail.summary}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] p-4">
              <p className="text-xs text-muted-foreground">기준 이탈</p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{detail.invalidationReview}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] p-4">
              <p className="text-xs text-muted-foreground">결과 메모</p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{detail.afterActionReview}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader>
            <CardTitle>다시 볼 체크리스트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.reviewChecklist.map((item) => (
              <div key={item} className="rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-3 text-sm leading-6 text-foreground/80">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </section>
  );
}
