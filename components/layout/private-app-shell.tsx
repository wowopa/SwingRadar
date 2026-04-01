import type { ReactNode } from "react";

import { AuthCta } from "@/components/layout/auth-cta";
import { BrandMark, BrandSignature } from "@/components/layout/brand-signature";
import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { PrivateNav } from "@/components/layout/private-nav";
import type { AuthSession } from "@/types/auth";

export function PrivateAppShell({
  children,
  session
}: {
  children: ReactNode;
  session: AuthSession;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="sticky top-2 z-40 sm:top-3 lg:top-4">
          <header className="overflow-visible rounded-[28px] border border-border/90 bg-white/94 px-3 py-3 shadow-[0_18px_40px_-30px_hsl(33_32%_22%_/_0.18)] backdrop-blur-md sm:px-4">
            <div className="flex items-center gap-3 lg:hidden">
              <BrandMark compact className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <GlobalSymbolSearch compact />
              </div>
              <div className="shrink-0">
                <PrivateNav iconOnly />
              </div>
            </div>

            <div className="hidden lg:flex lg:flex-col lg:gap-3 xl:flex-row xl:items-center xl:gap-4">
              <BrandSignature compact className="shrink-0" />

              <div className="xl:min-w-0 xl:flex-1">
                <PrivateNav />
              </div>

              <div className="flex flex-col gap-3 xl:w-[360px] xl:shrink-0">
                <GlobalSymbolSearch compact />
                <div className="flex justify-end">
                  <AuthCta session={session} />
                </div>
              </div>
            </div>
          </header>
        </div>

        <main className="mt-6 flex-1">{children}</main>

        <footer className="mt-12 border-t border-border/75 px-2 pt-6 text-center">
          <p className="text-xs tracking-[0.18em] text-muted-foreground">Copyright {currentYear} SWING-RADAR. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
