import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountGuideLibraryCard } from "@/components/account/account-guide-library-card";
import { AccountSessionSecurityCard } from "@/components/account/account-session-security-card";
import { AccountSupportPolicyCard } from "@/components/account/account-support-policy-card";
import { AccountThemeSettingsCard } from "@/components/account/account-theme-settings-card";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { getServiceContactInfo } from "@/lib/server/service-contact";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { formatDateTimeShort, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/?auth=login&next=%2Faccount");
  }

  const [profile, contact] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    Promise.resolve(getServiceContactInfo())
  ]);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title={`${session.user.displayName} 계정`}
        description="로그인 상태, 포트폴리오 연결, 가이드 재진입, 문의·정책 확인을 한곳에서 관리합니다."
      />

      <div data-tutorial="account-overview" className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card data-tutorial="account-info" className="border-border/70 bg-card/92 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-2">
              <CardTitle>계정 정보</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                현재 로그인 계정과 세션 만료 시점을 먼저 확인합니다.
              </p>
            </div>
            <LogoutButton variant="ghost" size="sm" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <AccountMetric label="이름" value={session.user.displayName} />
            <AccountMetric label="이메일" value={session.user.email} />
            <AccountMetric label="가입일" value={formatDateTimeShort(session.user.createdAt)} />
            <AccountMetric label="세션 만료" value={formatDateTimeShort(session.expiresAt)} />
          </CardContent>
        </Card>

        <Card data-tutorial="account-portfolio" className="border-border/70 bg-card/92 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle>포트폴리오 연결 상태</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              현재 자산 설정과 보유 종목 수를 확인하고 Today 또는 Portfolio로 바로 이동할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <AccountMetric label="프로필 이름" value={profile.name} />
              <AccountMetric label="보유 종목" value={`${profile.positions.length}개`} />
              <AccountMetric label="총 자산" value={profile.totalCapital > 0 ? formatPrice(profile.totalCapital) : "미입력"} />
              <AccountMetric label="가용 현금" value={profile.availableCash > 0 ? formatPrice(profile.availableCash) : "미입력"} />
            </div>

            <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
              자산과 보유 종목을 바꾸면 Portfolio의 Holdings, Journal, Reviews, Rules 보드에 바로 반영됩니다.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/portfolio">Portfolio 열기</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recommendations">Today 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AccountSessionSecurityCard sessionExpiresAt={session.expiresAt} />

        <div className="space-y-4">
          <AccountGuideLibraryCard />
          <AccountSupportPolicyCard contact={contact} />
        </div>
      </div>

      <AccountThemeSettingsCard />
    </main>
  );
}

function AccountMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
