import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const frameworkItems = [
  {
    title: "후보를 먼저 좁히기",
    body: "이 화면은 바로 매수 종목을 찍는 곳이 아니라 오늘 먼저 볼 만한 스윙 후보를 좁히는 곳입니다."
  },
  {
    title: "좋은 이유와 부족한 이유 같이 보기",
    body: "추세와 검증 수치가 좋아도 이벤트 근거나 무효화 여유가 약하면 한 단계 보수적으로 읽는 편이 좋습니다."
  },
  {
    title: "히스토릭은 신뢰의 바닥",
    body: "실측 기반인지, 유사 업종 참고인지에 따라 신뢰도를 다르게 보고 과거 결과를 함께 확인하는 것이 핵심입니다."
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
          <p>점수는 정렬을 돕는 숫자일 뿐이고, 실제 판단은 선정 이유와 경계 포인트를 함께 읽어야 더 안전합니다.</p>
          <p>기준 이탈 가격이 현재가와 가깝다면 좋아 보이는 후보라도 추격보다 눌림 확인 쪽이 더 적합할 수 있습니다.</p>
          <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
            핵심 원칙: 오늘 볼 이유와 아직 부족한 이유를 함께 본 뒤에 진입을 판단합니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
