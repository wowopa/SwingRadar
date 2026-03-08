# Symbol Master / Universe Scan

## 목표
- 전체 KRX 종목을 검색 가능한 상태로 확장
- 종목 마스터를 기반으로 watchlist / universe 스캔 파이프라인 구성
- 매일 추천 후보를 만들 수 있는 기반 데이터 구조 확보
- daily scan 결과가 `/recommendations`에 자동 반영되도록 운영 루프 구성

## 현재 구조
- 종목 마스터 원본: `data/config/symbol-master.json`
- 운영 watchlist 원본: `data/config/watchlist.json`
- 유니버스 watchlist 산출물: `data/config/watchlist.universe.json`
- 데일리 후보 산출물: `data/universe/daily-candidates.json`
- 일일 실행 엔트리: `scripts/run-daily-universe-cycle.mjs`

## 1. 종목 마스터 가져오기
KRX 또는 내부 보유 CSV를 아래 형식으로 준비합니다.

```csv
ticker,company,market,sector,dartCorpCode,aliases
005930,삼성전자,KOSPI,반도체,00126380,Samsung Electronics|삼전
035420,NAVER,KOSPI,인터넷,00266961,네이버
068270,셀트리온,KOSPI,제약/바이오,00413046,Celltrion
```

샘플 파일은 `data/config/symbol-master-template.csv`를 사용하면 됩니다.

가져오기:
```powershell
cd C:\Users\eugen\Documents\SwingRadar
& "C:\Program Files\nodejs\npm.cmd" run symbols:import -- --input data/config/symbol-master-template.csv
```

## 2. 유니버스 watchlist 생성
전체 종목 또는 시장별 batch watchlist를 생성합니다.

전체:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:watchlist
```

KOSDAQ만:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:watchlist -- --markets KOSDAQ
```

상위 200개만 테스트:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:watchlist -- --limit 200
```

## 3. 유니버스 batch 스캔 실행
유니버스 watchlist를 batch 단위로 나눠 외부 데이터 파이프라인을 돌리고, 데일리 후보를 합칩니다.

```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:scan -- --batch-size 20 --limit 100
```

출력:
- `data/universe/daily-candidates.json`

이 파일에는 `topCandidates`와 `batchSummaries`가 저장됩니다.

## 4. 하루 1회 자동 실행 엔트리
운영 환경에서는 아래 엔트리를 스케줄러에 연결하면 됩니다.

```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:daily -- --batch-size 20
```

옵션 예시:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:daily -- --markets KOSPI,KOSDAQ --batch-size 20
& "C:\Program Files\nodejs\npm.cmd" run universe:daily -- --markets KOSDAQ --limit 300 --batch-size 15
```

이 스크립트는 다음 순서로 실행합니다.
1. universe watchlist 생성
2. batch scan 실행
3. `daily-candidates.json` 갱신
4. `/recommendations`가 최신 후보를 자동 반영

## 5. 운영 권장 흐름
1. `symbol-master.json`을 전체 종목 기준으로 갱신
2. `universe:daily`를 하루 1회 실행
3. `/recommendations`에서 오늘의 상위 후보를 검토
4. 운영실에서 watchlist / 뉴스 / 검증 보정 필요 항목만 수동 조정

## 주의
- 전체 종목을 한 번에 외부 뉴스/시장 API로 돌리면 rate limit이 걸릴 수 있습니다.
- 실서비스에서는 `batch 실행`, `시장별 분할`, `섹터별 분할`, `queue 기반 스케줄링`이 필요합니다.
- 현재 코드는 그 준비 단계로, 종목 마스터와 유니버스 스캔 결과를 분리해 운용할 수 있도록 구성되어 있습니다.
- Windows 환경에서는 작업 스케줄러에서 `npm.cmd run universe:daily`를 오후 장 마감 이후 한 번 실행하는 구성이 가장 현실적입니다.
