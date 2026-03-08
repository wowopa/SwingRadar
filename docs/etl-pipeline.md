# SWING-RADAR ETL Pipeline

## 목적
원천 데이터(raw snapshot)에서 프론트/API가 직접 소비하는 `data/live/*.json` snapshot을 생성하는 파이프라인이다.

## 입력 디렉터리
기본값: `data/raw`

필수 파일:
- `market-snapshot.json`
- `news-snapshot.json`
- `validation-snapshot.json`
- `tracking-events.json`

## 출력 디렉터리
기본값: `data/live`

생성 파일:
- `recommendations.json`
- `analysis.json`
- `tracking.json`

## 실행
```powershell
cd C:\Users\eugen\Documents\SwingRadar
& "C:\Program Files\nodejs\node.exe" .\scripts\generate-snapshots.mjs
```

출력 디렉터리 지정:
```powershell
& "C:\Program Files\nodejs\node.exe" .\scripts\generate-snapshots.mjs --out-dir .\data\live
```

## 파이프라인 순서
1. raw market/news/validation/tracking 이벤트 로드
2. ticker 기준으로 데이터 병합
3. score, signalTone, invalidationDistance, signalLabel 계산
4. recommendation/analysis/tracking DTO 구조 생성
5. `data/live/*.json`에 snapshot 기록
6. 이후 `npm run db:ingest` 또는 `npm run admin:ingest`로 Postgres 반영

## 현재 계산 규칙
- `score = trendScore + flowScore + volatilityScore + eventScore + qualityScore`
- `signalTone`
  - `긍정`: score >= 75 and invalidationDistance <= -3 and hitRate >= 55
  - `주의`: score < 55 or invalidationDistance > -2.5
  - 나머지: `중립`
- `invalidationDistance = ((invalidationPrice - currentPrice) / currentPrice) * 100`

## 향후 확장 포인트
- raw market source를 외부 시세 API로 교체
- news source를 크롤링/벤더 API로 교체
- validation source를 백테스트 job 결과로 교체
- tracking events를 사내 signal ledger나 trade log로 교체