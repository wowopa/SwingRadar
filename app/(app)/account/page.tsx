import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { PageHeader } from "@/components/shared/page-header";
import { TutorialLauncherButton } from "@/components/tutorial/tutorial-launcher-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { formatDateTimeShort, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/?auth=login&next=%2Faccount");
  }

  const profile = await loadPortfolioProfileForUser(session.user.id);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title={`${session.user.displayName} 계정`}
        description="계정 정보와 현재 포트폴리오 연결 상태를 확인하는 화면입니다. 실제 자산과 보유 종목 수정은 Portfolio에서 진행합니다."
      />

      <div data-tutorial="account-overview" className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <CardTitle>계정 정보</CardTitle>
            <LogoutButton variant="ghost" size="sm" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <AccountMetric label="이름" value={session.user.displayName} />
            <AccountMetric label="이메일" value={session.user.email} />
            <AccountMetric label="가입일" value={formatDateTimeShort(session.user.createdAt)} />
            <AccountMetric label="세션 만료" value={formatDateTimeShort(session.expiresAt)} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle>현재 포트폴리오 연결</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <AccountMetric label="프로필 이름" value={profile.name} />
              <AccountMetric label="보유 종목 수" value={`${profile.positions.length}개`} />
              <AccountMetric label="총 자산" value={profile.totalCapital > 0 ? formatPrice(profile.totalCapital) : "미입력"} />
              <AccountMetric label="가용 현금" value={profile.availableCash > 0 ? formatPrice(profile.availableCash) : "미입력"} />
            </div>

            <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
              Portfolio 메뉴에서 자산, 현금, 보유 종목, 손실 한도를 수정하면 대시보드와 보유 관리 보드에 바로 반영됩니다.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/portfolio">Portfolio 열기</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recommendations">Dashboard 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-tutorial="account-tutorial" className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle>튜토리얼</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <TutorialLauncherButton label="현재 화면 튜토리얼" />
          <TutorialLauncherButton label="전체 튜토리얼 다시 보기" resetAll />
        </CardContent>
      </Card>
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
