import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const frameworkItems = [
  {
    title: "관찰 우선",
    body: "점수가 높아도 바로 매수로 보기보다 먼저 지켜볼 종목을 정리하는 화면입니다."
  },
  {
    title: "기준 이탈 먼저",
    body: "좋아 보여도 먼저 볼 것은 기준 이탈 가격입니다. 거리가 짧으면 더 보수적으로 해석합니다."
  },
  {
    title: "검증 근거 확인",
    body: "실측 기반인지, 유사 업종 참고인지에 따라 신뢰도를 다르게 읽는 편이 좋습니다."
  }
];

export function RecommendationFramework() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>읽는 순서</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {frameworkItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>운영 메모</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>점수가 높아도 바로 매수 신호로 보기보다 관찰 우선순위로 이해하는 편이 좋습니다.</p>
          <p>기준 이탈 가격이 현재가와 가깝다면 좋은 점수여도 보수적으로 보는 편이 안전합니다.</p>
          <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
            핵심 원칙: 좋아 보이는 이유보다 기준 이탈이 더 중요합니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
