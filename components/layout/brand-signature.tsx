import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

type BrandSignatureProps = {
  compact?: boolean;
  className?: string;
  tone?: "default" | "light";
};

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.6rem] border border-white/10 shadow-panel",
        compact ? "h-14 w-14" : "h-16 w-16 sm:h-[4.6rem] sm:w-[4.6rem]",
        className
      )}
    >
      <Image
        src="/brand/swingradar-bi.svg"
        alt=""
        fill
        className="object-cover"
        sizes={compact ? "56px" : "74px"}
      />
    </div>
  );
}

export function BrandSignature({ compact = false, className, tone = "default" }: BrandSignatureProps) {
  const isLight = tone === "light";

  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      <BrandMark compact={compact} />

      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.34em] sm:text-[11px]",
            isLight ? "text-white/68" : "text-foreground/66"
          )}
        >
          SWING SIGNAL RECOMMENDED SERVICE
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className={cn(
              "text-balance font-semibold tracking-[-0.05em]",
              isLight ? "text-white" : "text-foreground",
              compact ? "text-xl sm:text-2xl" : "text-[1.7rem] sm:text-[2.15rem]"
            )}
          >
            SWING-RADAR
          </p>
          {!compact ? (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]",
                isLight
                  ? "border border-white/12 bg-white/8 text-white/78"
                  : "border border-primary/20 bg-primary/10 text-primary"
              )}
            >
              Signal First
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
