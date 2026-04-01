"use client";

import Link from "next/link";
import { Compass, LayoutGrid, UserRound, WalletCards } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/recommendations",
    label: "Today",
    icon: LayoutGrid,
    match: ["/recommendations", "/opening-check"]
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: WalletCards,
    match: ["/portfolio"]
  },
  {
    href: "/signals",
    label: "Signals",
    icon: Compass,
    match: ["/signals", "/ranking", "/tracking", "/analysis"]
  },
  {
    href: "/account",
    label: "Account",
    icon: UserRound,
    match: ["/account", "/admin", "/support", "/maintenance"]
  }
] as const;

export function PrivateNav({ iconOnly = false }: { iconOnly?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0",
        iconOnly ? "justify-end overflow-visible px-0 pb-0" : undefined
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 snap-start items-center rounded-[20px] border transition-all duration-200",
              iconOnly ? "h-10 w-10 justify-center px-0 py-0" : "min-w-[132px] gap-2.5 px-3 py-2.5 sm:min-w-0",
              isActive
                ? "border-primary/24 bg-[linear-gradient(145deg,rgba(24,32,42,0.98),rgba(34,41,54,0.94))] text-primary-foreground shadow-[0_18px_40px_-30px_rgba(24,32,42,0.62)]"
                : "border-border/80 bg-white/90 text-foreground/82 hover:-translate-y-0.5 hover:border-primary/24 hover:bg-white"
            )}
            aria-label={item.label}
            title={item.label}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-2xl",
                iconOnly && isActive
                  ? "bg-transparent text-primary"
                  : isActive
                    ? "bg-primary/18 text-primary"
                    : "bg-secondary/55 text-foreground/70"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            {!iconOnly ? (
              <p className={cn("min-w-0 text-sm font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}>
                {item.label}
              </p>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
