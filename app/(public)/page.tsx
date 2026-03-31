import { redirect } from "next/navigation";

import { LandingPage } from "@/components/public/landing-page";
import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentUserSession();

  if (session) {
    redirect("/recommendations");
  }

  return <LandingPage />;
}
