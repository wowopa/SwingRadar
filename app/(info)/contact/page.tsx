import Link from "next/link";
import { LifeBuoy, Mail, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceContactInfo } from "@/lib/server/service-contact";

export default function ContactPage() {
  const contact = getServiceContactInfo();

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="space-y-4 rounded-[36px] border border-border/70 bg-card/92 p-6 shadow-sm sm:p-8">
        <Badge variant="secondary">Support</Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">문의와 운영 안내</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            계정 문제, 데이터 오류, 서비스 동작 이상은 이 페이지를 기준으로 접수합니다. 투자 판단 자체에 대한 책임은 사용자에게 있지만,
            서비스 오동작과 기록 불일치는 운영 측에서 먼저 확인합니다.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-border/70 bg-card/92 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              문의 채널
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              {contact.supportEmail
                ? `운영 메일은 ${contact.supportEmail}입니다. 접수 후 ${contact.responseWindow} 안에 1차 답변을 목표로 합니다.`
                : "아직 운영 메일이 설정되지 않았습니다. 배포 전에는 SWING_RADAR_SUPPORT_EMAIL을 실제 주소로 설정해야 합니다."}
            </p>
            <p>운영 확인 시간은 {contact.supportHours} 기준입니다.</p>
            {contact.supportEmail ? (
              <p className="rounded-[22px] border border-primary/20 bg-primary/8 px-4 py-3 text-foreground/82">
                메일 제목에 `계정`, `데이터`, `버그`, `보안` 중 하나를 앞에 붙이면 분류가 더 빨라집니다.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/92 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              먼저 보내면 좋은 내용
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>문제가 보인 화면 경로와 사용한 메뉴</p>
            <p>발생 시각과 종목 코드</p>
            <p>기대한 결과와 실제 결과</p>
            <p>가능하면 스크린샷 또는 재현 순서</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/92 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            정책과 공지 확인
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <PolicyLink href="/terms" title="이용약관" description="계정 이용 범위와 금지 행위를 확인합니다." />
          <PolicyLink href="/privacy" title="개인정보 처리방침" description="저장 데이터와 보관 원칙을 확인합니다." />
          <PolicyLink href="/disclaimer" title="투자 유의" description="분석 결과와 투자 책임 범위를 확인합니다." />
        </CardContent>
      </Card>
    </main>
  );
}

function PolicyLink({
  href,
  title,
  description
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border border-border/70 bg-background/85 p-4 transition hover:border-primary/22 hover:bg-primary/6"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
