# SWING-RADAR Daily Ops Quickstart

## 매일 보는 흐름
1. 상태 확인
```powershell
curl http://localhost:3000/api/health
```

2. 일일 배치 실행
```powershell
& "C:\Program Files\nodejs\npm.cmd" run universe:daily -- --markets KOSPI,KOSDAQ --batch-size 100 --concurrency 4
```

3. 자동 복구 실행
```powershell
& "C:\Program Files\nodejs\npm.cmd" run ops:auto-heal
```

4. 운영 체크
- `/admin` 상태 탭에서 `배치 지연`, `자동 복구`, `뉴스 수집 현황`, `스냅샷 생성 현황` 확인
- `/admin/audit`에서 최근 실패 로그 확인

## 자주 쓰는 보조 명령
환경 점검:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\test-ops-environment.ps1
```

외부 데이터 재수집:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run etl:refresh:external
```

스냅샷만 재생성:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run etl:generate
```

심볼 동기화만 실행:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run symbols:sync
```

## 문제가 있을 때 먼저 볼 것
- `latest-daily-cycle.json`: 최근 배치 성공/실패
- `latest-auto-heal.json`: 자동 복구 결과
- `latest-news-fetch.json`: 뉴스 수집 현황
- `latest-snapshot-generation.json`: 검증 fallback 종목 수

이 파일들은 기본적으로 `data/ops` 아래에 저장됩니다.
