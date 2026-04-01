import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide backdrop-blur",
  {
    variants: {
      variant: {
        default: "border-primary/38 bg-primary/14 text-primary",
        secondary: "border-border/80 bg-white/78 text-secondary-foreground",
        positive: "border-positive/38 bg-positive/14 text-positive",
        neutral: "border-neutral/38 bg-neutral/14 text-neutral",
        caution: "border-caution/38 bg-caution/14 text-caution"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
