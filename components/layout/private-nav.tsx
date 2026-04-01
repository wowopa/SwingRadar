"use client";

import Link from "next/link";
import { Compass, LayoutGrid, UserRound, WalletCards } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/recommendations",
    label: "Today",
    description: "내 오늘 행동",
    icon: LayoutGrid,
    match: ["/recommendations", "/opening-check"]
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    description: "내 자산과 보유",
    icon: WalletCards,
    match: ["/portfolio"]
  },
  {
    href: "/signals",
    label: "Signals",
    description: "공통 후보와 복기",
    icon: Compass,
    match: ["/signals", "/ranking", "/tracking", "/analysis"]
  },
  {
    href: "/account",
    label: "Account",
    description: "계정과 세션",
    icon: UserRound,
    match: ["/account", "/admin", "/support", "/maintenance"]
  }
] as const;

export function PrivateNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-w-[170px] shrink-0 snap-start items-center gap-3 rounded-[24px] border px-4 py-3 transition-all duration-200 sm:min-w-0",
              isActive
                ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                : "border-border/80 bg-white/90 text-foreground/78 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl",
                isActive ? "bg-primary/15 text-primary" : "bg-secondary/45 text-foreground/70"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className={cn("text-xs", isActive ? "text-primary/80" : "text-muted-foreground")}>{item.description}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
