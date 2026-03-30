import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackingSelectionGuideProps {
  maxActive: number;
  maxWatch: number;
  minAverageTurnover20: number;
  minWatchActivationScore: number;
  minEntryActivationScore: number;
  minEntryAppearances: number;
  minEntryAverageTurnover20: number;
  cooldownDays: number;
  maxWatchDays: number;
  maxHoldingDays: number;
  confirmationBufferRatio: number;
}

function formatEok(value: number) {
  return `${Math.round(value / 100_000_000).toLocaleString("ko-KR")}억원`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function TrackingSelectionGuide(props: TrackingSelectionGuideProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>공용 추적 선정 기준</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          공용 추적은 오늘 랭킹 후보를 그대로 보여주지 않고, 반복 등장 이력과 유동성, 가격 구조를 한 번 더 확인해 자동 감시 시작과
          진입 추적으로 나눠 관리합니다. 단기 급등 뒤 과열 신호가 강한 종목은 추격하지 않도록 별도 억제 조건도 함께 적용합니다.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
          <p className="text-sm font-semibold text-foreground">자동 감시 시작</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>활성화 점수 {props.minWatchActivationScore}점 이상</li>
            <li>20일 평균 거래대금 {formatEok(props.minAverageTurnover20)} 이상</li>
            <li>현재가가 무효화 가격 위에 있어야 함</li>
            <li>최근 상위 후보 등장 이력 1회 이상</li>
            <li>RSI 과열, 20일선 과도 이격, 거래량 급증이 겹치면 자동 감시도 보류</li>
            <li>자동 감시 상태는 최대 {props.maxWatchDays}거래일 유지</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
          <p className="text-sm font-semibold text-foreground">진입 추적</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>활성화 점수 {props.minEntryActivationScore}점 이상</li>
            <li>20일 평균 거래대금 {formatEok(props.minEntryAverageTurnover20)} 이상</li>
            <li>최근 상위 후보 등장 이력 {props.minEntryAppearances}회 이상</li>
            <li>확인 가격 근처 돌파, 거래량, 추세, RSI 조건 확인</li>
            <li>단기 과열 신호가 남아 있으면 추격 진입 대신 자동 감시 단계 유지</li>
            <li>확인 가격의 {formatPercent(props.confirmationBufferRatio)} 위에서 구조가 유지되면 진입 추적으로 승격</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
          <p className="text-sm font-semibold text-foreground">운영 제한</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>진행 중인 종목은 최대 {props.maxActive}개까지 유지</li>
            <li>자동 감시 포함 live 종목은 최대 {props.maxWatch}개까지 유지</li>
            <li>종료 후 {props.cooldownDays}일 동안은 재편입을 쉬고 다시 평가</li>
            <li>진입 추적은 최대 {props.maxHoldingDays}거래일까지 보유</li>
            <li>조건을 지키지 못하면 자동으로 종료 또는 자동 감시 해제</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
