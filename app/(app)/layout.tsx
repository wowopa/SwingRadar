import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PrivateAppShell } from "@/components/layout/private-app-shell";
import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/auth");
  }

  return <PrivateAppShell session={session}>{children}</PrivateAppShell>;
}
