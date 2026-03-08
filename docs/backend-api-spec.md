# SWING-RADAR Backend API Spec

## 목적
SWING-RADAR는 종목 추천 서비스가 아니라, 관찰 신호의 강도와 근거, 무효화 조건, 검증 통계, 사후 추적 결과를 구조적으로 제공하는 서비스입니다.

핵심 원칙은 다음과 같습니다.
- 종목 추천 문구보다 관찰 신호, 무효화, 검증, 사후 추적을 우선합니다.
- 응답은 summary-only가 아니라 `rationale`, `invalidation`, `validation`, `tracking`까지 함께 제공해야 합니다.
- App Router와 서버 컴포넌트가 직접 활용할 수 있도록 JSON API 중심으로 설계합니다.

## 공통 규칙
### Base URL
- Local: `http://localhost:3000/api`
- Production example: `https://api.swing-radar.com/v1`

### Headers
- Request: `Content-Type: application/json`
- Optional: `Authorization: Bearer <token>`
- Optional: `X-Request-Id: <uuid>`

### Time format
- 모든 시간은 ISO 8601 사용
- 예시: `2026-03-07T01:00:00+09:00`

### Locale
- 기본 로케일은 `ko-KR`
- 필요하면 `locale=ko-KR` 같은 query param으로 확장 가능

### Error response
```json
{
  "message": "Not found",
  "code": "RESOURCE_NOT_FOUND",
  "requestId": "req_123456"
}
```

## Endpoint Summary
- `GET /api/recommendations`
- `GET /api/analysis/:ticker`
- `GET /api/tracking`
- `GET /api/health`

향후 분리 가능 후보:
- `GET /api/tracking/:historyId`
- `GET /api/news?ticker=005930&from=2026-03-01&to=2026-03-07`
- `GET /api/validation/:ticker`

---

## 1. Recommendations

### GET `/api/recommendations`
관찰 신호 보드의 목록 데이터입니다.

### Query Params
- `market`: `KRX` | `KOSPI` | `KOSDAQ`
- `signalTone`: `긍정` | `중립` | `주의`
- `limit`: integer
- `sort`: `score_desc` | `updatedAt_desc` | `hitRate_desc`

### Response
```json
{
  "generatedAt": "2026-03-07T01:00:00+09:00",
  "items": [
    {
      "ticker": "005930",
      "company": "삼성전자",
      "sector": "반도체",
      "signalTone": "긍정",
      "score": 82,
      "signalLabel": "박스 상단 재돌파 관찰",
      "rationale": "거래대금 회복과 단기 수급 반전이 함께 확인됩니다.",
      "invalidation": "72,000원 지지 이탈 시 구조 재평가",
      "invalidationDistance": -4.1,
      "riskRewardRatio": "1 : 2.3",
      "validationSummary": "유사 구조 41건 기준 승률 63%",
      "checkpoints": ["72,000원 지지 유지", "실적 추정 상향 여부"],
      "validation": {
        "hitRate": 63,
        "avgReturn": 5.8,
        "sampleSize": 41,
        "maxDrawdown": -4.2
      },
      "observationWindow": "5~15거래일",
      "updatedAt": "2026-03-06 08:40"
    }
  ],
  "dailyScan": null
}
```

### Required calculation fields
- `score`: 0~100 범위 권장
- `signalTone`: score, invalidationDistance, validation 등을 종합한 분류
- `invalidationDistance`: 현재가 대비 무효화 가격까지의 거리, percent
- `riskRewardRatio`: 리스크 대비 기대 보상 비율
- `validation.hitRate`: 유사 패턴 사후 적중률
- `validation.avgReturn`: 관찰 윈도우 평균 수익률
- `validation.maxDrawdown`: 동일 조건 사후 최대 낙폭

### Backend notes
- UI는 `rationale`, `invalidation`, `validationSummary`, `checkpoints`를 그대로 사용합니다.
- null 대신 명시적 빈 배열/빈 문자열을 반환하는 편이 안전합니다.

---

## 2. Analysis

### GET `/api/analysis/:ticker`
단일 종목 심화 분석 데이터입니다.

### Path Params
- `ticker`: 종목 코드

### Query Params
- `includeNews=true|false`
- `includeQuality=true|false`
- `asOf=2026-03-07`

### Response
```json
{
  "ticker": "005930",
  "company": "삼성전자",
  "signalTone": "긍정",
  "score": 82,
  "headline": "추세 복원 여부를 관찰할 구간입니다.",
  "invalidation": "72,000원 이탈 시 관찰 구조 재정의",
  "analysisSummary": [
    { "label": "추세 구조", "value": "박스 상단 회복", "note": "중기 추세 전환 가능성 확인 구간" }
  ],
  "keyLevels": [
    { "label": "무효화", "price": "72,000원", "meaning": "지지 이탈 시 관찰 종료" }
  ],
  "decisionNotes": ["추격보다 눌림 확인이 우선", "거래대금 동반 여부 체크"],
  "scoreBreakdown": [
    { "label": "추세 구조", "score": 23, "description": "중기 추세 복원 가능성" }
  ],
  "scenarios": [
    { "label": "기본 시나리오", "probability": 55, "expectation": "완만한 상방", "trigger": "72,000원 지지 유지" }
  ],
  "riskChecklist": [
    { "label": "무효화 거리", "status": "주의", "note": "현재가 대비 -4.1%" }
  ],
  "newsImpact": [
    { "headline": "메모리 가격 개선 기대", "impact": "긍정", "summary": "수급 측면 우호적 변수", "source": "연합뉴스", "url": "https://example.com", "date": "2026-03-06", "eventType": "news" }
  ],
  "dataQuality": [
    { "label": "뉴스", "value": "6건", "note": "최근 7일 기준" }
  ]
}
```

### Required calculation fields
- `scoreBreakdown[*].score`: 부분 점수 합산이 전체 score와 연결되어야 함
- `scenarios[*].probability`: 총합 100 기준 권장
- `riskChecklist[*].status`: `양호` | `확인 필요` | `주의`
- `newsImpact[*].impact`: `긍정` | `중립` | `주의`
- `dataQuality[*].value`: UI에 바로 노출 가능한 문자열

### Backend notes
- `headline`은 투자 권유 문구가 아니라 관찰형 문장으로 유지
- `decisionNotes`는 2~4개 권장
- `keyLevels`는 최소 3개 권장: 무효화 / 확장 / 확인

---

## 3. Tracking

### GET `/api/tracking`
사후 추적 요약과 상세 맵을 한 번에 내려주는 엔드포인트입니다.

### Query Params
- `ticker`
- `result`
- `from`, `to`
- `limit`

### Response
```json
{
  "generatedAt": "2026-03-07T01:00:00+09:00",
  "history": [
    {
      "id": "hist-005930-20260301",
      "ticker": "005930",
      "company": "삼성전자",
      "signalDate": "2026-03-01",
      "signalTone": "긍정",
      "entryScore": 79,
      "result": "관찰 유지",
      "mfe": 4.8,
      "mae": -1.9,
      "holdingDays": 5
    }
  ],
  "details": {
    "hist-005930-20260301": {
      "historyId": "hist-005930-20260301",
      "summary": "추세 회복 가능성을 관찰한 사례입니다.",
      "invalidationReview": "무효화 이탈 없이 지지가 유지되었습니다.",
      "afterActionReview": "추격보다 눌림 확인 위주 접근이 유효했습니다.",
      "reviewChecklist": ["거래대금 증가 확인"],
      "metrics": [
        { "label": "사후 판정", "value": "관찰 유지", "note": "무효화 전 도달" }
      ],
      "chartSnapshot": [{ "label": "D1", "price": 70600 }],
      "historicalNews": [
        { "id": "news-1", "date": "2026-03-02", "headline": "메모리 가격 개선 기대", "impact": "긍정", "note": "수급 개선 기대", "source": "연합뉴스", "url": "https://example.com", "eventType": "news" }
      ],
      "scoreLog": [
        { "timestamp": "2026-03-01 09:10", "factor": "거래대금", "delta": 6, "reason": "20일 평균 대비 1.7배 증가" }
      ]
    }
  }
}
```

### Required calculation fields
- `mfe`: 최대 유리 구간, percent
- `mae`: 최대 불리 구간, percent
- `holdingDays`: 관찰 유지 기간
- `result`: 후행 판정 문자열
- `scoreLog[*].delta`: signed number

### Backend notes
- 현재는 `history`와 `details`를 한 번에 반환하지만, 추후 `GET /api/tracking/:historyId`로 분리 가능
- `reviewChecklist`는 사후 복기용 문장 배열 권장
- `metrics`는 카드형 메타데이터로 최소 3개 권장

---

## Signal / Invalidation / Validation Rules

### Signal tone rule example
- `긍정`: score >= 75 and invalidationDistance <= -3 and validation.hitRate >= 55
- `중립`: score 55~74
- `주의`: score < 55 or event risk high or invalidationDistance > -2.5

### Score input factors
권장 factor set:
- 추세 구조
- 거래대금
- 수급 변화
- 이벤트 밀도

각 factor는 0~25 또는 0~20 범위에서 구성하고 총합은 100 기준 권장.

### Invalidation calculation
권장 입력 값:
- `invalidationPrice`
- `currentPrice`
- `invalidationDistance`
- `invalidationReasonCode`

백엔드는 추후 계산/감사 추적을 위해 서술형 필드와 숫자 필드를 함께 저장하는 편이 좋습니다.

### Validation calculation
권장 입력 값:
- `sampleSize`
- `hitRate`
- `avgReturn`
- `medianReturn`
- `maxDrawdown`
- `lookaheadWindowDays`
- `backtestVersion`

---

## Recommended future endpoint split

### Option A: current bundle-oriented
- `GET /api/tracking`

장점:
- 초기 화면 로딩이 단순함
- 클라이언트 fetch orchestration 부담이 적음

단점:
- history가 많아지면 payload가 커짐

### Option B: normalized
- `GET /api/tracking`
- `GET /api/tracking/:historyId`
- `GET /api/tracking/:historyId/score-log`
- `GET /api/tracking/:historyId/news`

장점:
- 페이지네이션과 부분 로딩에 유리
- 후속 확장에 유연함

단점:
- 클라이언트 fetch orchestration이 늘어남

현재 제품 단계에서는 A로 시작하고, 운영 데이터가 쌓이면 B로 전환하는 것이 현실적입니다.

---

## Env suggestion
- `SWING_RADAR_API_ORIGIN=https://api.swing-radar.com`
- `NEXT_PUBLIC_APP_URL=https://app.swing-radar.com`

서버 컴포넌트 fetch는 `SWING_RADAR_API_ORIGIN`을 우선 사용합니다.

---

## Backend implementation checklist
- 모든 한글 문자열은 UTF-8 유지
- 종목/뉴스/검증 스키마의 Zod validation 유지
- requestId 전달
- stale data timestamp 노출
- 운영 로그 및 에러 코드 정리

---

## Data Provider Modes

### `SWING_RADAR_DATA_PROVIDER=mock`
- 개발 초기 단계용
- 코드에 포함된 mock response 사용

### `SWING_RADAR_DATA_PROVIDER=file`
- 운영 직전 또는 백업 모드
- `SWING_RADAR_DATA_DIR` 아래 JSON 파일 사용
- 파일명
  - `recommendations.json`
  - `analysis.json`
  - `tracking.json`

### `SWING_RADAR_DATA_PROVIDER=postgres`
- 운영 기본 모드
- 최신 snapshot을 PostgreSQL에서 조회
- 실패 시 fallback provider로 전환 가능