# SWING-RADAR Backend API Spec

## 紐⑹쟻
SWING-RADAR??醫낅ぉ 異붿쿇 ?쒕퉬?ㅺ? ?꾨땲?? 愿李??좏샇??洹쇨굅, 臾댄슚??議곌굔, 寃利??듦퀎, ?ы썑 異붿쟻 寃곌낵瑜?援ъ“?곸쑝濡??쒓났?섎뒗 ?쒕퉬?ㅻ떎.
諛깆뿏?쒕뒗 ?꾨옒 ?먯튃??留뚯”?댁빞 ?쒕떎.

- UI???쒓뎅??以묒떖 ?띿뒪?몃? 洹몃?濡??뚮뜑留곹븷 ???덉뼱???쒕떎.
- 醫낅ぉ 異붿쿇 臾멸뎄蹂대떎 愿李??좏샇, 臾댄슚?? 寃利? ?ы썑 異붿쟻???곗꽑?대떎.
- ?묐떟? summary-only媛 ?꾨땲??rationale/invalidation/validation/tracking???④퍡 ?쒓났?댁빞 ?쒕떎.
- ?꾨줎?몃뒗 ?꾩옱 App Router ?쒕쾭 fetch 湲곕컲?쇰줈 ?숈옉?섎?濡?JSON API ?묐떟???덉젙?곸씠?댁빞 ?쒕떎.

## 怨듯넻 洹쒖튃

### Base URL
- Local: `http://localhost:3000/api`
- Production example: `https://api.swing-radar.com/v1`

### Headers
- Request: `Content-Type: application/json`
- Optional: `Authorization: Bearer <token>`
- Optional: `X-Request-Id: <uuid>`

### Time format
- 紐⑤뱺 ?쒓컙? ISO 8601 ?ъ슜
- ?덉떆: `2026-03-07T01:00:00+09:00`

### Locale
- ?ㅻ챸 ?띿뒪???꾨뱶??湲곕낯?곸쑝濡??쒓뎅??諛섑솚
- ?ㅺ뎅???뺤옣???꾩슂?섎㈃ `locale=ko-KR` query param 異붽? 媛??
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

?ν썑 ?뺤옣 ?꾨낫:
- `GET /api/tracking/:historyId`
- `GET /api/news?ticker=005930&from=2026-03-01&to=2026-03-07`
- `GET /api/validation/:ticker`

---

## 1. Recommendations

### GET `/api/recommendations`
愿李??좏샇 蹂대뱶??紐⑸줉 ?곗씠??

### Query Params
- `market`: `KRX` | `KOSPI` | `KOSDAQ`
- `signalTone`: `湲띿젙` | `以묐┰` | `二쇱쓽`
- `limit`: integer
- `sort`: `score_desc` | `updatedAt_desc` | `hitRate_desc`

### Response
```json
{
  "generatedAt": "2026-03-07T01:00:00+09:00",
  "items": [
    {
      "ticker": "005930",
      "company": "?쇱꽦?꾩옄",
      "sector": "諛섎룄泥?,
      "signalTone": "湲띿젙",
      "score": 82,
      "signalLabel": "?뚰뙆 ???뚮┝ 媛먯떆",
      "rationale": "嫄곕옒?湲??뚮났怨?諛뺤뒪 ?곷떒 ?щ룎??..",
      "invalidation": "醫낃? 湲곗? 5?쇱꽑 ?댄깉??2???곗냽 諛쒖깮...",
      "invalidationDistance": -4.1,
      "riskRewardRatio": "1 : 2.3",
      "validationSummary": "?좎궗 援ъ“ 41嫄?湲곗?...",
      "checkpoints": ["72,000??吏吏 ?щ?", "?멸뎅???쒕ℓ??吏??],
      "validation": {
        "hitRate": 63,
        "avgReturn": 5.8,
        "sampleSize": 41,
        "maxDrawdown": -4.2
      },
      "observationWindow": "5~15嫄곕옒??,
      "updatedAt": "2026-03-06 08:40"
    }
  ]
}
```

### Required calculation fields
- `score`: 0~100 ?뺤닔 沅뚯옣
- `signalTone`: score 援ш컙怨?由ъ뒪??猷곗쓣 ?④퍡 諛섏쁺
- `invalidationDistance`: ?꾩옱媛 ?鍮?臾댄슚???덈꺼 嫄곕━, percent
- `riskRewardRatio`: ?띿뒪???뚮뜑留곸슜 鍮꾩쑉
- `validation.hitRate`: ?좎궗 ?⑦꽩 ?ы썑 ?곸쨷瑜?- `validation.avgReturn`: 愿李??덈룄??湲곗? ?됯퇏 ?섏씡瑜?- `validation.maxDrawdown`: ?숈씪 議곌굔 ?ы썑 理쒕? ?숉룺 ?됯퇏 ?먮뒗 ??쒖튂

### Backend notes
- UI??`rationale`, `invalidation`, `validationSummary`, `checkpoints`瑜?洹몃?濡??ъ슜?쒕떎.
- null ???媛?ν븳 ??鍮?諛곗뿴/鍮?臾몄옄?대낫??紐낆떆?곸씤 媛?諛섑솚 沅뚯옣.

---

## 2. Analysis

### GET `/api/analysis/:ticker`
媛쒕퀎 ?곗빱 ?ы솕 遺꾩꽍 ?섏씠吏???곗씠??

### Path Params
- `ticker`: ?쒓뎅 二쇱떇 ?곗빱 臾몄옄??
### Query Params
- `includeNews=true|false`
- `includeQuality=true|false`
- `asOf=2026-03-07`

### Response
```json
{
  "ticker": "005930",
  "company": "?쇱꽦?꾩옄",
  "signalTone": "湲띿젙",
  "score": 82,
  "headline": "異붿꽭 蹂듭썝??愿李??좏샇...",
  "invalidation": "醫낃? 湲곗? 72,000???섑쉶...",
  "analysisSummary": [
    { "label": "?꾩옱 ?댁꽍", "value": "?곗긽??蹂듭썝", "note": "異붿꽭 ?ъ쭊?????뚮┝ ?뚰솕 援ш컙" }
  ],
  "keyLevels": [
    { "label": "臾댄슚??, "price": "72,000??, "meaning": "?댄깉 ??愿李??쒕굹由ъ삤 ?먭린" }
  ],
  "decisionNotes": ["怨쇱뿴 異붽꺽蹂대떎 ?뚮┝ ?좎? ?щ? ?뺤씤???곗꽑?낅땲??"],
  "scoreBreakdown": [
    { "label": "異붿꽭 援ъ“", "score": 23, "description": "以묎린 異붿꽭???곹쉶? ?꾧퀬???ъ떆??媛?μ꽦." }
  ],
  "scenarios": [
    { "label": "湲곕낯", "probability": 55, "expectation": "?꾨쭔???곗긽??, "trigger": "72,000??吏吏 ?좎?" }
  ],
  "riskChecklist": [
    { "label": "臾댄슚???덈꺼 嫄곕━", "status": "?묓샇", "note": "?꾩옱媛 ?鍮?-4.1% ?섏?" }
  ],
  "newsImpact": [
    { "headline": "硫붾え由??낇솴 媛쒖꽑 湲곕?", "impact": "湲띿젙", "summary": "?ㅼ쟻 異붿젙 ?곹뼢 湲곕?" }
  ],
  "dataQuality": [
    { "label": "媛寃??곗씠??, "value": "?뺤긽", "note": "遺꾨큺/?쇰큺 ?쇨????뺤씤" }
  ]
}
```

### Required calculation fields
- `scoreBreakdown[*].score`: 珥앺빀 ?먮뒗 遺遺꾪빀???꾩껜 score? ?쇨??섏뼱????- `scenarios[*].probability`: ?⑷퀎 100 沅뚯옣
- `riskChecklist[*].status`: `?묓샇 | ?뺤씤 ?꾩슂 | 二쇱쓽`
- `newsImpact[*].impact`: `湲띿젙 | 以묐┰ | 二쇱쓽`
- `dataQuality[*].value`: ?꾨줎?몃뒗 臾몄옄??洹몃?濡?異쒕젰

### Backend notes
- `headline`? ?ъ옄 沅뚯쑀 臾멸뎄瑜??쇳븯怨?愿李고삎 臾몄옣?쇰줈 ?좎?
- `decisionNotes`??2~4媛?沅뚯옣
- `keyLevels`??理쒖냼 3媛?沅뚯옣: 臾댄슚??/ ?ы솗??/ ?뺤옣

---

## 3. Tracking

### GET `/api/tracking`
?ы썑 異붿쟻 ?섏씠吏???대젰 紐⑸줉 + ?곸꽭 留?
?꾩옱 ?꾨줎?몃뒗 ??踰덉쓽 payload濡?history? detail map??媛숈씠 諛쏅뒗??

### Query Params
- `ticker`
- `result`: `吏꾪뻾以?| ?깃났 | ?ㅽ뙣 | 臾댄슚??
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
      "company": "?쇱꽦?꾩옄",
      "signalDate": "2026-03-01",
      "signalTone": "湲띿젙",
      "entryScore": 79,
      "result": "吏꾪뻾以?,
      "mfe": 4.8,
      "mae": -1.9,
      "holdingDays": 5
    }
  ],
  "details": {
    "hist-005930-20260301": {
      "historyId": "hist-005930-20260301",
      "summary": "珥덇린 ?뚰뙆 ???뚮┝??吏㏐쾶 諛쒖깮...",
      "invalidationReview": "?꾩옱源뚯? 臾댄슚??議곌굔 誘몄땐議?..",
      "afterActionReview": "湲곕낯 ?쒕굹由ъ삤媛 ?좎??섍퀬 ?덉쑝硫?..",
      "reviewChecklist": ["嫄곕옒?湲?利앷? ?좎? ?뺤씤"],
      "metrics": [
        { "label": "?ы썑 ?먯젙", "value": "?좏슚 吏꾪뻾以?, "note": "臾댄슚??誘몄땐議??곹깭" }
      ],
      "chartSnapshot": [{ "label": "D1", "price": 70600 }],
      "historicalNews": [
        { "id": "news-1", "date": "2026-03-02", "headline": "硫붾え由??낇솴 媛쒖꽑 湲곕? ?뺤궛", "impact": "湲띿젙", "note": "?섍툒 ?좎엯怨??④퍡 ?좏샇 ?먯닔 ?좎???湲곗뿬." }
      ],
      "scoreLog": [
        { "timestamp": "2026-03-01 09:10", "factor": "嫄곕옒?湲?, "delta": 6, "reason": "20???됯퇏 ?鍮?1.7諛?利앷?" }
      ]
    }
  }
}
```

### Required calculation fields
- `mfe`: 理쒕? ?좊━ 蹂?숉룺, percent
- `mae`: 理쒕? 遺덈━ 蹂?숉룺, percent
- `holdingDays`: ?좏샇 ?좎? 湲곌컙
- `result`: ?꾩옱 ?꾨줎?몃뒗 `吏꾪뻾以?| ?깃났 | ?ㅽ뙣 | 臾댄슚??
- `scoreLog[*].delta`: ?먯닔 蹂?숇텇, signed number

### Backend notes
- ?꾩옱 ?꾨줎?몃뒗 `history`? `details`瑜??④퍡 諛쏆?留? 異뷀썑 `GET /api/tracking/:historyId`濡?遺꾨━ 媛??- `reviewChecklist`???ы썑 蹂듦린 媛?ν븳 臾몄옣??諛곗뿴 沅뚯옣
- `metrics`??移대뱶??硫뷀??곗씠?곕줈 理쒖냼 3媛?沅뚯옣

---

## Signal / Invalidation / Validation Computation Rules

### Signal tone rule example
- `湲띿젙`: score >= 75 and invalidationDistance <= -3 and validation.hitRate >= 55
- `以묐┰`: score 55~74
- `二쇱쓽`: score < 55 or event risk high or invalidationDistance > -2.5

### Score input factors
沅뚯옣 factor set:
- 異붿꽭 援ъ“
- ?섍툒
- 蹂?숈꽦
- ?대깽???댁뒪
- ?곗씠???좊ː??
媛?factor??0~25 ?먮뒗 0~20 踰붿쐞濡??뺢퇋??媛??
珥앺빀? 100 湲곗? ?좎? 沅뚯옣.

### Invalidation calculation
沅뚯옣 ?꾨뱶:
- `invalidationPrice`
- `currentPrice`
- `invalidationDistance`
- `invalidationReasonCode`

?꾨줎?몃뒗 ?꾩옱 `invalidation` 臾몄옣怨?`invalidationDistance`留??꾩닔 ?ъ슜?섏?留?
諛깆뿏?쒕뒗 異뷀썑 怨꾩궛/媛먯궗 異붿쟻???꾪빐 ?レ옄 ?꾨뱶瑜?媛숈씠 ??ν븯??寃껋씠 醫뗫떎.

### Validation calculation
理쒖냼 蹂댁쑀 ?꾨뱶:
- `sampleSize`
- `hitRate`
- `avgReturn`
- `medianReturn`
- `maxDrawdown`
- `lookaheadWindowDays`
- `backtestVersion`

?꾩옱 ?꾨줎?몃뒗 ?쇰?留??ъ슜?섏?留? ?섎㉧吏 ?꾨뱶??諛깆뿏?쒖뿉???좎? 沅뚯옣.

---

## Recommended future endpoint split

### Option A: current bundle-oriented
- `GET /api/tracking`

?μ젏:
- ?꾨줎??援ы쁽 ?⑥닚
- 泥?踰꾩쟾 鍮좊쫫

?⑥젏:
- history 而ㅼ?硫?payload 鍮꾨?

### Option B: normalized
- `GET /api/tracking`
- `GET /api/tracking/:historyId`
- `GET /api/tracking/:historyId/score-log`
- `GET /api/tracking/:historyId/news`

?μ젏:
- ?뺤옣???곗닔
- pagination ?⑹씠

?⑥젏:
- ?꾨줎??fetch orchestration ?꾩슂

?꾩옱 ?쒗뭹 ?④퀎?먯꽌??A濡??쒖옉?섍퀬, ?댁쁺 ?곗씠?곌? ?볦씠硫?B濡??꾪솚?섎뒗 寃껋씠 ?⑸━?곸씠??

---

## Env suggestion
- `SWING_RADAR_API_ORIGIN=https://api.swing-radar.com`
- `NEXT_PUBLIC_APP_URL=https://app.swing-radar.com`

?쒕쾭 而댄룷?뚰듃 fetch??`SWING_RADAR_API_ORIGIN` ?곗꽑 ?ъ슜 沅뚯옣.

---

## Backend implementation checklist
- ?묐떟 臾몄옄??UTF-8 蹂댁옣
- ?쒓뎅???띿뒪???꾨뱶 湲몄씠 ?쒗븳 ?뺤쓽
- score ?곗떇 踰꾩쟾 愿由?- validation ?곗떇 踰꾩쟾 愿由?- requestId 濡쒓퉭
- stale data timestamp ?쒓났
- ?쒖옣 ?댁옣???μ쨷 ?낅뜲?댄듃 洹쒖튃 ?뺤쓽
- error code ?쒖??
---

## Data Provider Modes

### `SWING_RADAR_DATA_PROVIDER=mock`
- 개발 초기 단계용
- 코드에 포함된 mock response를 사용
- 빠른 프론트 검증에 적합

### `SWING_RADAR_DATA_PROVIDER=file`
- 운영 직전 또는 내부 스테이징용
- `SWING_RADAR_DATA_DIR` 아래 JSON 파일을 읽음
- 파일명:
  - `recommendations.json`
  - `analysis.json`
  - `tracking.json`

이 구조는 이후 DB provider, warehouse provider, internal API provider로 쉽게 확장할 수 있도록 설계한다.

### 향후 권장 provider 추가
- `postgres`
- `supabase`
- `internal-api`
- `warehouse`

각 provider는 아래 인터페이스를 만족하면 된다.
- `getRecommendations()`
- `getAnalysis()`
- `getTracking()`
- `getProviderMeta()`