import Link from "next/link";
import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceContactInfo } from "@/lib/server/service-contact";

export function AccountSupportPolicyCard({ contact }: { contact: ServiceContactInfo }) {
  return (
    <Card data-tutorial="account-support" className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>문의와 정책</CardTitle>
          <Badge variant={contact.supportEmail ? "secondary" : "caution"}>
            {contact.supportEmail ? "문의 채널 준비" : "운영 메일 확인 필요"}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          데이터 오류, 계정 문제, 운영 공지 확인 경로와 기본 정책 문서를 한곳에 모았습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-border/70 bg-secondary/24 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              문의 메일
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {contact.supportEmail
                ? `${contact.supportEmail} · ${contact.responseWindow} 안에 확인합니다.`
                : "배포 전 실제 운영 메일을 설정해야 합니다. 설정 전에는 공개 서비스로 열지 않는 편이 안전합니다."}
            </p>
            {contact.supportEmail ? (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={`mailto:${contact.supportEmail}`}>메일 보내기</a>
              </Button>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/24 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LifeBuoy className="h-4 w-4 text-primary" />
              공지와 대응 기준
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              운영 시간은 {contact.supportHours} 기준이며, 데이터 이상과 점검 소식은 {contact.statusPageLabel}에서 먼저 안내합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SupportLinkCard href="/contact" label="문의 안내" description="무엇을 어디로 보내야 하는지 정리했습니다." />
          <SupportLinkCard href="/terms" label="이용약관" description="서비스 이용 범위와 계정 책임을 안내합니다." />
          <SupportLinkCard href="/privacy" label="개인정보 처리방침" description="저장 데이터와 보관 원칙을 설명합니다." />
          <SupportLinkCard href="/disclaimer" label="투자 유의" description="분석 결과를 받아들이는 기준을 명시합니다." />
        </div>

        <div className="rounded-[24px] border border-primary/16 bg-primary/7 px-4 py-4 text-sm leading-6 text-foreground/82">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            정책 기준일
          </div>
          <p className="mt-2 text-muted-foreground">현재 계정 화면에 연결된 정책 문서는 {contact.policyUpdatedAt} 기준 초안입니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SupportLinkCard({
  href,
  label,
  description
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border border-border/70 bg-background/85 p-4 transition hover:border-primary/22 hover:bg-primary/6"
    >
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
