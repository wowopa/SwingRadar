import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SignalTone } from "@/types/recommendation";

const toneVariantMap: Record<SignalTone, "positive" | "neutral" | "caution"> = {
  긍정: "positive",
  중립: "neutral",
  주의: "caution"
};

export function SignalToneBadge({ tone }: { tone: SignalTone }) {
  return (
    <Badge
      variant={toneVariantMap[tone]}
      className={cn(
        "inline-flex min-w-[64px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium leading-none"
      )}
    >
      {tone}
    </Badge>
  );
}
