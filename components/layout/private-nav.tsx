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
        "flex gap-2",
        iconOnly
          ? "items-center justify-end overflow-visible"
          : "items-center justify-center"
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
              "inline-flex shrink-0 items-center rounded-full border transition-all duration-200",
              iconOnly ? "h-10 w-10 justify-center px-0 py-0" : "h-10 gap-2 px-4",
              isActive
                ? iconOnly
                  ? "border-white/14 bg-white/12 text-white shadow-[0_18px_40px_-30px_rgba(24,32,42,0.62)]"
                  : "border-white/14 bg-white/10 text-white shadow-[0_18px_40px_-30px_rgba(24,32,42,0.48)]"
                : iconOnly
                  ? "border-white/10 bg-white/4 text-white/72 hover:bg-white/8 hover:text-white"
                  : "border-transparent bg-transparent text-white/72 hover:border-white/10 hover:bg-white/6 hover:text-white"
            )}
            aria-label={item.label}
            title={item.label}
          >
            <div
              className={cn(
                "flex items-center justify-center",
                iconOnly ? "h-10 w-10 rounded-full" : "h-4 w-4 rounded-none",
                isActive ? "text-white" : "text-current"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            {!iconOnly ? (
              <p className="min-w-0 text-sm font-medium">
                {item.label}
              </p>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
