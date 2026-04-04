"use client";

import Link from "next/link";
import { Compass, LayoutGrid, WalletCards } from "lucide-react";
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
              "group inline-flex shrink-0 items-center transition-colors duration-200",
              iconOnly ? "h-10 w-10 justify-center rounded-full" : "h-10 gap-2 px-2.5",
              isActive
                ? "font-bold text-white"
                : "font-medium text-slate-300 hover:text-white"
            )}
            aria-label={item.label}
            title={item.label}
          >
            <div className={cn("flex items-center justify-center", iconOnly ? "h-10 w-10 rounded-full" : "h-4 w-4 rounded-none")}>
              <Icon className="h-4 w-4" />
            </div>
            {!iconOnly ? (
              <p className="min-w-0 text-sm">{item.label}</p>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
