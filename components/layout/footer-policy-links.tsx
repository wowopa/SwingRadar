import Link from "next/link";

import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "/contact", label: "문의" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보 처리방침" },
  { href: "/disclaimer", label: "투자 유의" }
] as const;

export function FooterPolicyLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      {footerLinks.map((item) => (
        <Link key={item.href} href={item.href} className="transition hover:text-foreground">
          {item.label}
        </Link>
      ))}
    </div>
  );
}
