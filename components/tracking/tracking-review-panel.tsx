import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrackingDetail } from "@/types/tracking";

export function TrackingReviewPanel({ detail }: { detail: TrackingDetail }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
        <CardTitle>복기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">요약</p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">{detail.summary}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">기준 점검</p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">{detail.invalidationReview}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">AAR 메모</p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">{detail.afterActionReview}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
        <CardTitle>복기 체크리스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.reviewChecklist.map((item) => (
            <div key={item} className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm leading-6 text-foreground/80">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
