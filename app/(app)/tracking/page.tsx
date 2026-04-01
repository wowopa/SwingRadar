import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrackingPage() {
  redirect("/signals?tab=tracking");
}
