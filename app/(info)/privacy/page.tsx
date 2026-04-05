import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceContactInfo } from "@/lib/server/service-contact";

const sections = [
  {
    title: "수집하는 정보",
    paragraphs: [
      "회원 가입과 로그인 과정에서 이메일, 표시 이름, 비밀번호 해시, 세션 정보가 저장됩니다.",
      "서비스 사용 과정에서 포트폴리오 자산, 보유 종목, 거래 저널, 복기, 개인 규칙, 운영 로그가 함께 저장될 수 있습니다."
    ]
  },
  {
    title: "사용 목적",
    paragraphs: [
      "계정 인증과 세션 유지",
      "Today, Signals, Portfolio, Reviews, Rules 화면 개인화",
      "기록 복구, 보안 대응, 운영 품질 확인"
    ]
  },
  {
    title: "보관과 파기",
    paragraphs: [
      "세션 정보는 만료된 뒤 정리됩니다.",
      "계정과 포트폴리오 데이터는 서비스 운영과 사용자 요청 대응을 위해 보관되며, 계정 삭제 정책이 정해지면 별도 절차로 안내합니다."
    ]
  },
  {
    title: "제3자 제공",
    paragraphs: [
      "사용자 입력 포트폴리오와 저널 데이터는 기본적으로 외부 파트너에게 판매하거나 제공하지 않습니다.",
      "다만 데이터 공급자, 인프라, 인증 운영에 필요한 범위의 기술 처리 경로는 존재할 수 있습니다."
    ]
  },
  {
    title: "사용자 권리",
    paragraphs: [
      "사용자는 문의 채널을 통해 본인 데이터 확인, 수정, 삭제 요청을 남길 수 있습니다.",
      "배포 전에는 실제 운영 메일과 처리 절차를 반드시 최종 확정해야 합니다."
    ]
  }
] as const;

export default function PrivacyPage() {
  const contact = getServiceContactInfo();

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="space-y-4 rounded-[36px] border border-border/70 bg-card/92 p-6 shadow-sm sm:p-8">
        <Badge variant="secondary">Privacy</Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">개인정보 처리방침 초안</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            현재 서비스가 실제로 저장하는 계정, 세션, 포트폴리오, 거래 기록 기준으로 작성한 초안입니다.
          </p>
        </div>
      </section>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title} className="border-border/70 bg-card/92 shadow-sm">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">정책 기준일: {contact.policyUpdatedAt}</p>
    </main>
  );
}
