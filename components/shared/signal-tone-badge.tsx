import { Badge } from "@/components/ui/badge";
import type { SignalTone } from "@/types/recommendation";

const toneVariantMap: Record<SignalTone, "positive" | "neutral" | "caution"> = {
  긍정: "positive",
  중립: "neutral",
  주의: "caution"
};

export function SignalToneBadge({ tone }: { tone: SignalTone }) {
  return <Badge variant={toneVariantMap[tone]}>{tone}</Badge>;
}
