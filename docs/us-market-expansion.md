# US Market Expansion

## 목표
- KRX 운영 루프가 안정화된 뒤 미국 주식도 같은 구조로 붙입니다.
- 기본 흐름은 `심볼 동기화 -> 유니버스 후보 생성 -> 외부 데이터 수집 -> 스냅샷 생성`입니다.

## 먼저 준비할 것
1. 미국 심볼 CSV
2. 미국 시세 소스에서 사용하는 티커 표기
3. 뉴스 검색용 별칭

## CSV 형식
다음 컬럼만 맞추면 현재 importer에 바로 넣을 수 있습니다.

```csv
ticker,company,market,sector,dartCorpCode,aliases
AAPL,Apple Inc,NASDAQ,Consumer Electronics,,Apple
MSFT,Microsoft Corp,NASDAQ,Software,,Microsoft
NVDA,NVIDIA Corp,NASDAQ,Semiconductors,,NVIDIA
```

## 가져오는 방법
기존 마스터에 합칠 때:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run symbols:import -- --input C:\path\to\us-symbols.csv --merge
```

미국 심볼만 따로 테스트할 때:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run symbols:import -- --input C:\path\to\us-symbols.csv
```

## 운영 전 체크
- `market`은 `NYSE`, `NASDAQ`, `AMEX` 중 하나여야 합니다.
- `aliases`에는 사용자가 실제로 검색할 이름을 같이 넣는 편이 좋습니다.
- 미국 종목은 공시 체계가 KRX/DART와 다르므로 초기에 `dartCorpCode`는 비워두는 것이 정상입니다.

## 다음 개발 포인트
- 미국 전용 뉴스 쿼리 확장
- 시장 시간대 차이 반영
- 미국 종목용 유효성 검증 표본 별도 구축
