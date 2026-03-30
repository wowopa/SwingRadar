import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRecommendationActionMeta, type RecommendationActionBucket } from "@/lib/recommendations/action-plan";

export function ActionBucketBadge({
  bucket,
  className
}: {
  bucket: RecommendationActionBucket;
  className?: string;
}) {
  const meta = getRecommendationActionMeta(bucket);

  return (
    <Badge
      variant={meta.variant}
      className={cn("inline-flex min-w-[78px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium", className)}
    >
      {meta.shortLabel}
    </Badge>
  );
}
