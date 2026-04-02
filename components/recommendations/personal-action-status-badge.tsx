import { Badge } from "@/components/ui/badge";
import type { TodayActionBoardItemDto, TodayActionBoardStatusDto } from "@/lib/api-contracts/swing-radar";

const PERSONAL_ACTION_META: Record<
  TodayActionBoardStatusDto,
  {
    label: string;
    variant: "default" | "secondary" | "positive" | "neutral" | "caution";
  }
> = {
  buy_review: {
    label: "내 기준 매수 검토",
    variant: "positive"
  },
  watch: {
    label: "내 기준 관찰",
    variant: "neutral"
  },
  avoid: {
    label: "내 기준 보류",
    variant: "caution"
  },
  excluded: {
    label: "내 기준 제외",
    variant: "default"
  },
  pending: {
    label: "내 기준 장초 확인 전",
    variant: "secondary"
  }
};

export function PersonalActionStatusBadge({
  item,
  className
}: {
  item?: Pick<TodayActionBoardItemDto, "boardStatus" | "boardReason"> | null;
  className?: string;
}) {
  if (!item) {
    return null;
  }

  const meta = PERSONAL_ACTION_META[item.boardStatus];

  return (
    <Badge variant={meta.variant} className={className} title={item.boardReason}>
      {meta.label}
    </Badge>
  );
}
