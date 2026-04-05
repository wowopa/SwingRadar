import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceContactInfo } from "@/lib/server/service-contact";

const sections = [
  {
    title: "서비스 성격",
    paragraphs: [
      "SwingRadar는 스윙 트레이딩 관리와 복기를 돕는 참고 도구입니다.",
      "종목 추천, Today 보드, Analysis 화면, Portfolio 기록은 모두 사용자의 투자 판단을 보조하기 위한 정보 정리 기능입니다."
    ]
  },
  {
    title: "계정과 접근",
    paragraphs: [
      "사용자는 본인 계정과 비밀번호를 직접 관리해야 합니다.",
      "여러 기기에서 로그인한 경우 Account 화면의 세션 관리 카드에서 다른 기기 세션을 해제할 수 있습니다."
    ]
  },
  {
    title: "기록 데이터",
    paragraphs: [
      "포트폴리오 자산, 보유 종목, 거래 저널, 복기, 개인 규칙은 사용자 계정에 연결된 운영 데이터로 저장됩니다.",
      "사용자가 입력한 데이터가 사실과 다르거나 오래되면 서비스 결과 해석도 달라질 수 있습니다."
    ]
  },
  {
    title: "금지되는 사용",
    paragraphs: [
      "서비스를 자동 대량 요청, 비정상 로그인 시도, 운영 방해, 데이터 무단 수집 용도로 사용하는 것은 허용되지 않습니다.",
      "보안 이상이 의심되면 운영 측은 세션 해제나 계정 제한 조치를 할 수 있습니다."
    ]
  },
  {
    title: "가용성과 변경",
    paragraphs: [
      "데이터 공급 상황, 배치 상태, 점검 여부에 따라 일부 화면이나 추천 결과가 일시적으로 제한될 수 있습니다.",
      "운영 정책과 서비스 구조는 개선을 위해 변경될 수 있으며, 주요 변경은 공지 또는 정책 기준일 갱신으로 안내합니다."
    ]
  }
] as const;

export default function TermsPage() {
  const contact = getServiceContactInfo();

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="space-y-4 rounded-[36px] border border-border/70 bg-card/92 p-6 shadow-sm sm:p-8">
        <Badge variant="secondary">Terms</Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">이용약관 초안</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            본 문서는 무료 공개 서비스 기준 초안입니다. 실제 서비스 개시 전에는 운영 메일, 정책 기준일, 금지 행위 범위를 최종 운영 정책과 함께
            재검토하는 편이 안전합니다.
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
