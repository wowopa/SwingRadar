import { PageHeader } from "@/components/shared/page-header";
import { PasswordResetPanel } from "@/components/auth/password-reset-panel";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Account"
        title="비밀번호 재설정"
        description="로그인하지 못할 때도 비밀번호를 다시 설정할 수 있게 링크 기반 흐름을 제공합니다."
      />
      <PasswordResetPanel token={params.token ?? null} />
    </main>
  );
}
