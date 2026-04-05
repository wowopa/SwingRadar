import type { ReactNode } from "react";

import { PrivateAppShell } from "@/components/layout/private-app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function InfoLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentUserSession();

  if (session) {
    return <PrivateAppShell session={session}>{children}</PrivateAppShell>;
  }

  return <PublicShell>{children}</PublicShell>;
}
