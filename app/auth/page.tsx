import { AuthPanel } from "@/components/auth/auth-panel";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getCurrentUserSession();
  const nextHref =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account";

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title={session ? `${session.user.displayName}님 계정` : "개인 계정"}
        description="이제 공용 분석 화면이 아니라, 내 포트폴리오와 내 행동 기준으로 서비스를 쓰기 위한 시작 단계입니다."
      />
      <section className="mx-auto max-w-3xl">
        <AuthPanel nextHref={nextHref} />
      </section>
    </main>
  );
}
