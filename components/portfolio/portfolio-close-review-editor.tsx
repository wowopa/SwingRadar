"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PortfolioCloseReviewEntry } from "@/types/recommendation";

export function PortfolioCloseReviewEditor({
  positionKey,
  ticker,
  closedAt,
  review,
  compact = false
}: {
  positionKey: string;
  ticker: string;
  closedAt: string;
  review?: PortfolioCloseReviewEntry | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [strengthsNote, setStrengthsNote] = useState(review?.strengthsNote ?? "");
  const [watchoutsNote, setWatchoutsNote] = useState(review?.watchoutsNote ?? "");
  const [nextRuleNote, setNextRuleNote] = useState(review?.nextRuleNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStrengthsNote(review?.strengthsNote ?? "");
    setWatchoutsNote(review?.watchoutsNote ?? "");
    setNextRuleNote(review?.nextRuleNote ?? "");
  }, [review]);

  async function saveReview() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account/portfolio-close-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionKey,
          ticker,
          closedAt,
          strengthsNote,
          watchoutsNote,
          nextRuleNote
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? `회고 저장에 실패했습니다. (${response.status})`);
      }

      setMessage("회고를 저장했습니다.");
      startTransition(() => {
        router.refresh();
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "회고 저장에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">내 회고</Badge>
        {review?.updatedAt ? (
          <p className="text-xs text-muted-foreground">
            마지막 저장 {new Date(review.updatedAt).toLocaleDateString("ko-KR")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">짧게 남겨도 다음 복기가 훨씬 쉬워집니다.</p>
        )}
      </div>

      <div className={compact ? "grid gap-3" : "grid gap-4"}>
        <ReviewTextarea
          label="잘한 점"
          placeholder="예: 장초 확인 통과 후 계획대로 첫 진입"
          value={strengthsNote}
          onChange={setStrengthsNote}
          compact={compact}
        />
        <ReviewTextarea
          label="아쉬운 점"
          placeholder="예: 부분 익절 없이 한 번에 정리"
          value={watchoutsNote}
          onChange={setWatchoutsNote}
          compact={compact}
        />
        <ReviewTextarea
          label="다음 규칙"
          placeholder="예: 보류 상태에서는 당일 진입하지 않기"
          value={nextRuleNote}
          onChange={setNextRuleNote}
          compact={compact}
        />
      </div>

      {message ? <p className="text-sm text-positive">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" onClick={() => void saveReview()} disabled={isPending} size={compact ? "sm" : "default"}>
        {isPending ? "저장 중..." : review ? "회고 수정 저장" : "회고 저장"}
      </Button>
    </div>
  );
}

function ReviewTextarea({
  label,
  placeholder,
  value,
  onChange,
  compact
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  compact: boolean;
}) {
  return (
    <label className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={compact ? 3 : 4}
        className="min-h-0 border-border/80 bg-white/90 text-sm leading-6"
      />
    </label>
  );
}
