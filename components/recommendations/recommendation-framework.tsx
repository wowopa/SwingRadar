import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const frameworkItems = [
  {
    title: "추천보다 관찰",
    body: "이 화면은 당장 사야 할 종목을 고르기보다, 지금 천천히 볼 만한 종목을 정리하는 공간입니다."
  },
  {
    title: "가격 기준 먼저",
    body: "좋아 보여도 먼저 확인할 것은 다시 봐야 하는 가격입니다. 그 가격이 너무 가깝다면 더 조심해서 보는 편이 좋습니다."
  },
  {
    title: "과거 흐름 참고",
    body: "각 종목에는 비슷한 흐름에서 어떤 결과가 나왔는지 함께 붙어 있어, 처음 보는 분도 감을 잡기 쉽게 했습니다."
  }
];

export function RecommendationFramework() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>이 화면 보는 법</CardTitle>
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
          <CardTitle>쉽게 이해하면</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>점수가 높으면 흐름이 상대적으로 괜찮다는 뜻이지만, 그 자체로 매수 신호를 뜻하지는 않습니다.</p>
          <p>가장 먼저 볼 것은 "다시 봐야 하는 가격"입니다. 그 가격이 현재가와 너무 가까우면 좋은 점수라도 조심해서 봐야 합니다.</p>
          <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
            핵심만 보면: 좋아 보이는 이유보다 먼저, 어디서 다시 판단할지를 확인하면 됩니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
