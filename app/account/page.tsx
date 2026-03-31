import { redirect } from "next/navigation";

import { AccountPortfolioPanel } from "@/components/account/account-portfolio-panel";
import { PageHeader } from "@/components/shared/page-header";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCurrentUserSession();
  if (!session) {
    redirect("/auth?next=%2Faccount");
  }

  const profile = await loadPortfolioProfileForUser(session.user.id);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="My Account"
        title={`${session.user.displayName}님의 포트폴리오`}
        description="총 자산, 가용 현금, 보유 종목, 진입일을 입력하면 오늘 행동 보드와 보유 관리 보드가 내 계좌 기준으로 계산됩니다."
      />
      <AccountPortfolioPanel
        initialProfile={{
          ...profile,
          name:
            profile.positions.length > 0 || profile.totalCapital > 0 || profile.availableCash > 0
              ? profile.name
              : `${session.user.displayName} 포트폴리오`
        }}
      />
    </main>
  );
}
