"use client";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteTickerButton({
  active,
  onClick,
  label = "즐겨찾기"
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("h-9 w-9 rounded-full border border-border/70", active && "border-primary/40 bg-primary/10 text-primary")}
    >
      <Star className={cn("h-4 w-4", active && "fill-current")} />
    </Button>
  );
}
