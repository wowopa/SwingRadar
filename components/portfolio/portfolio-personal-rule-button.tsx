"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PortfolioPersonalRuleEntry } from "@/types/recommendation";

export function PortfolioPersonalRuleButton({
  text,
  sourceCategory,
  existingRules
}: {
  text: string;
  sourceCategory: PortfolioPersonalRuleEntry["sourceCategory"];
  existingRules: PortfolioPersonalRuleEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const existingRule = existingRules.find((rule) => rule.text === text);
  const isPromoted = Boolean(existingRule);
  const isActive = existingRule?.isActive ?? false;

  async function promoteRule() {
    if (isPromoted && isActive) {
      return;
    }

    setError(null);

    try {
      const response = existingRule
        ? await fetch("/api/account/portfolio-personal-rules", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existingRule.id,
              isActive: true
            })
          })
        : await fetch("/api/account/portfolio-personal-rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              sourceCategory
            })
          });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? `개인 규칙 저장에 실패했습니다. (${response.status})`);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : "개인 규칙 저장에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPromoted && isActive ? (
        <Badge variant="positive">개인 규칙 반영됨</Badge>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => void promoteRule()} disabled={isPending}>
          {isPending ? "저장 중..." : existingRule ? "다시 켜기" : "개인 규칙으로 승격"}
        </Button>
      )}
      {isPromoted && !isActive ? <Badge variant="secondary">비활성화됨</Badge> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
