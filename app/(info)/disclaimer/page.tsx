import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceContactInfo } from "@/lib/server/service-contact";

const sections = [
  {
    title: "투자 책임",
    paragraphs: [
      "본 서비스는 투자 자문 계약이나 자동 매매 서비스가 아닙니다.",
      "최종 매수, 매도, 보유, 손절, 익절 판단과 그 결과에 대한 책임은 사용자에게 있습니다."
    ]
  },
  {
    title: "데이터 신뢰 해석",
    paragraphs: [
      "서비스는 실측 기반, 공용 추적 참고, 유사 업종 fallback, 보수 계산 등 신뢰도 차이를 함께 보여줍니다.",
      "fallback 비중이 높거나 표본이 약한 경우 결과는 더 보수적으로 해석해야 합니다."
    ]
  },
  {
    title: "수익 보장 없음",
    paragraphs: [
      "어떤 종목 카드, 신호, 가이드, 복기 규칙도 수익을 보장하지 않습니다.",
      "과거 성과와 반복 패턴은 미래 결과를 보장하지 않습니다."
    ]
  },
  {
    title: "서비스 가용성",
    paragraphs: [
      "외부 데이터 공급, 배치 처리, 점검, 시장 휴장 여부에 따라 일부 정보가 지연되거나 비어 있을 수 있습니다.",
      "주말과 휴장일에는 장초 확인이 진행되지 않으며, 복기와 계획 정리 흐름 중심으로 안내됩니다."
    ]
  }
] as const;

export default function DisclaimerPage() {
  const contact = getServiceContactInfo();

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="space-y-4 rounded-[36px] border border-border/70 bg-card/92 p-6 shadow-sm sm:p-8">
        <Badge variant="secondary">Disclaimer</Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">투자 유의와 면책</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            제품 신뢰와 운영 책임은 서비스가 지고, 투자 실행 책임은 사용자가 지는 선을 분명히 하기 위한 안내입니다.
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
