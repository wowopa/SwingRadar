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
        "brand-signature relative overflow-hidden rounded-[1.6rem] border border-primary/15 shadow-panel",
        compact ? "h-14 w-14" : "h-16 w-16 sm:h-[4.6rem] sm:w-[4.6rem]",
        className
      )}
    >
      <svg
        viewBox="0 0 88 88"
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0.5" y="0.5" width="87" height="87" rx="27.5" className="fill-[url(#bg)] stroke-white/20" />
        <circle cx="44" cy="44" r="24" stroke="rgba(250,246,239,0.16)" strokeWidth="1.5" />
        <circle cx="44" cy="44" r="16" stroke="rgba(250,246,239,0.14)" strokeWidth="1.5" />
        <path
          d="M19 53C26.5 52.4 28.2 40.8 35.2 40.8C42.2 40.8 42.7 54.8 49.8 54.8C56.2 54.8 57.8 33.8 68.5 33.8"
          stroke="rgba(250,246,239,0.96)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M61 28.5L69.2 33.6L63.4 41.5"
          stroke="rgba(250,246,239,0.96)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="35.2" cy="40.8" r="3.1" fill="rgba(255,221,157,0.95)" />
        <circle cx="49.8" cy="54.8" r="3.1" fill="rgba(134,232,186,0.95)" />
        <defs>
          <linearGradient id="bg" x1="10" y1="8" x2="77" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(39 47% 34%)" />
            <stop offset="0.55" stopColor="hsl(31 33% 24%)" />
            <stop offset="1" stopColor="hsl(210 20% 15%)" />
          </linearGradient>
        </defs>
      </svg>
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
            isLight ? "text-white/42" : "text-muted-foreground"
          )}
        >
          KRX Swing Signal Workspace
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
