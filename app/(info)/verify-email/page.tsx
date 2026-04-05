import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";
import { PageHeader } from "@/components/shared/page-header";

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Account"
        title="이메일 검증"
        description="검증 링크가 유효하면 계정 이메일 확인을 직접 마무리할 수 있습니다."
      />
      <EmailVerificationPanel token={params.token ?? null} />
    </main>
  );
}
