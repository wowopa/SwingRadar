import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const frameworkItems = [
  {
    title: "관찰 톤",
    body: "긍정·중립·주의는 진입 지시가 아니라, 패턴 유지 가능성과 리스크 밀도를 한눈에 구분하기 위한 신호 톤입니다."
  },
  {
    title: "무효화 우선",
    body: "근거보다 먼저 확인해야 하는 것은 시나리오 폐기 조건입니다. 무효화가 짧으면 신호가 좋아 보여도 보수적으로 해석합니다."
  },
  {
    title: "사후 검증 연결",
    body: "각 신호는 tracking 화면의 결과, MFE/MAE, 뉴스, 점수 로그로 이어져서 이후 재평가에 사용됩니다."
  }
];

export function RecommendationFramework() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>신호 해석 프레임</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {frameworkItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <p className="text-sm font-semibold text-white">{item.title}</p>
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
          <p>이 화면은 종목 선택을 강하게 유도하는 UI가 아니라, 관찰 우선순위와 무효화 거리, 검증 통계를 함께 놓고 비교하기 위한 보드입니다.</p>
          <p>점수가 높아도 무효화 거리가 짧거나 이벤트 민감도가 높으면 보수적으로 봐야 합니다.</p>
          <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
            핵심 원칙: 근거가 좋아 보여도 무효화가 더 중요합니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}