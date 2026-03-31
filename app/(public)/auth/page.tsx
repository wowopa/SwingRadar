import { redirect } from "next/navigation";

import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string; mode?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getCurrentUserSession();
  const nextHref =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/recommendations";
  const mode = params.mode === "signup" ? "signup" : "login";

  if (session) {
    redirect(nextHref);
  }

  redirect(`/?auth=${mode}&next=${encodeURIComponent(nextHref)}`);
}
