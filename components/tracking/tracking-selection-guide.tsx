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
    <details className="group rounded-[28px] border border-border/70 bg-white/82 shadow-sm">
      <summary className="list-none cursor-pointer px-6 py-5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">공용 관찰 기준</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              공용 관찰 목록이 어떤 기준으로 오늘 먼저 볼 종목을 고르고, 장초 확인을 거쳐 실제 행동 종목만 남기는지 필요할 때만 펼쳐서 볼 수 있습니다.
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs font-medium text-foreground/78 transition group-open:bg-primary/10 group-open:text-primary">
            {`기준 ${"보기"}`}
          </span>
        </div>
      </summary>

      <div className="border-t border-border/70 px-6 pb-6 pt-5">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
            <p className="text-sm font-semibold text-foreground">1. 오늘 먼저 볼 종목</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              오전 8시경 수신한 전일 데이터로 오늘 먼저 볼 종목을 좁히는 단계입니다.
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>관찰 우선순위가 {props.minWatchActivationScore}점 이상일 때</li>
              <li>20일 평균 거래대금이 {formatEok(props.minAverageTurnover20)} 이상일 때</li>
              <li>현재가가 손절 기준 위에서 구조를 유지할 때</li>
              <li>최근 상위권으로 최소 1회 이상 반복 등장했을 때</li>
              <li>RSI 과열, 20일선 과도 이격, 거래량 급증이 겹치면 관찰도 보류</li>
              <li>관찰 상태는 최대 {props.maxWatchDays}거래일까지 유지</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
            <p className="text-sm font-semibold text-foreground">2. 장초 확인</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              장 시작 후 5~10분 동안 갭과 확인 가격 반응을 다시 보고 매수 검토 여부를 정합니다.
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>관찰 우선순위가 {props.minEntryActivationScore}점 이상일 때</li>
              <li>20일 평균 거래대금이 {formatEok(props.minEntryAverageTurnover20)} 이상일 때</li>
              <li>최근 상위권 반복 등장 이력이 {props.minEntryAppearances}회 이상일 때</li>
              <li>확인 가격 돌파, 거래량, 추세 구조가 함께 맞아떨어질 때</li>
              <li>단기 과열 신호가 강하면 추격 매수 대신 다시 관찰 단계로 유지</li>
              <li>확인 가격의 {formatPercent(props.confirmationBufferRatio)} 범위 안에서 구조를 지키면 매수 검토로 승격</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
            <p className="text-sm font-semibold text-foreground">3. 당일 행동과 보유 관리</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              장초 확인을 통과한 종목만 실제 행동 종목으로 옮기고, 나머지는 관찰 또는 보류로 둡니다.
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>추적 중인 종목은 최대 {props.maxActive}개까지만 유지</li>
              <li>관찰 포함 전체 live 종목은 최대 {props.maxWatch}개까지만 유지</li>
              <li>종료 후에는 {props.cooldownDays}일 동안 쉬었다가 다시 평가</li>
              <li>매수 검토 종목은 최대 {props.maxHoldingDays}거래일까지 보유를 전제로 관리</li>
              <li>조건을 더 이상 만족하지 못하면 자동 종료 또는 관찰 해제</li>
            </ul>
          </div>
        </div>
      </div>
    </details>
  );
}
