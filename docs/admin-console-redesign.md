# Admin Console Redesign

## Why

현재 admin 콘솔은 "운영 콘솔"이라는 목적에 비해 탭 책임이 섞여 있다.

- `status` 탭에 너무 많은 역할이 몰려 있다.
  - health
  - batch
  - validation
  - storage
  - access stats
  - candidate review
- `portfolio` 탭은 현재 제품 방향상 사용자 영역에 더 가깝고, 운영 핵심과는 거리가 있다.
- 실제 운영자는 "서비스가 정상인가", "오늘 배치가 정상인가", "공통 후보를 보정해야 하는가", "공지할 것이 있는가"를 빠르게 보고 싶다.

따라서 admin 콘솔은 "기능 모음"이 아니라 "운영 질문" 기준으로 다시 나눠야 한다.

## Goals

새 admin 콘솔은 아래 질문에 바로 답해야 한다.

1. 지금 서비스는 정상인가
2. 오늘 새벽 배치와 데이터 품질은 괜찮은가
3. 공통 후보를 사람이 보정해야 하는가
4. 사용자에게 운영 공지를 띄워야 하는가

## New Information Architecture

### 1. Overview

목적:
- 운영자가 첫 진입 시 30초 안에 현재 상태를 파악하는 홈

보여줄 것:
- overall status
- critical / warning incidents
- stale snapshot 여부
- provider fallback 여부
- 오늘 daily cycle 성공 여부
- validation fallback 비율
- news live fetch 비율
- 바로 이동 CTA
  - `데이터 품질 보기`
  - `후보 운영 보기`
  - `운영 공지 보기`

제외할 것:
- 긴 설명
- access stats 상세 테이블
- candidate 리뷰 상세 폼

원칙:
- 숫자와 배지 중심
- 4~6개의 운영 카드만
- 상세는 아래 탭으로 이동

### 2. Data Quality

목적:
- 배치와 산출물의 신뢰도를 확인하는 화면

보여줄 것:
- daily cycle report
- auto-heal report
- snapshot generation report
- validation fallback count / percent
- measured validation percent
- news fetch quality
  - live fetch percent
  - cache fallback percent
  - file fallback percent
- threshold advice
- runtime storage / database storage

운영 질문:
- 오늘 snapshot은 믿을 수 있는가
- validation이 너무 fallback 중심인가
- news 수집 품질이 떨어졌는가
- storage가 비정상적으로 커졌는가

제외할 것:
- access stats
- popup notice
- candidate manual review

### 3. Candidate Ops

목적:
- 공통 후보를 운영자가 수동 보정하는 공간

보여줄 것:
- 오늘 공통 후보 top candidates
- review status
- note
- watchlist 승격
- watchlist override 관리
  - sector
  - keyword
  - DART code
  - sync status

하위 섹션:
- `Today Candidates`
- `Watchlist Overrides`

운영 질문:
- 오늘 시스템 후보 중 사람이 개입할 것이 있는가
- 외부 입력 품질을 위해 특정 종목 메타데이터를 손봐야 하는가

제외할 것:
- health
- access stats
- popup notice

### 4. Notices

목적:
- 운영 공지 관리

보여줄 것:
- popup notice 설정
- 노출 기간
- 제목 / 본문 / 이미지
- 미리보기

운영 질문:
- 오늘 사용자에게 띄워야 하는 공지가 있는가

### 5. Audit

목적:
- 문제 발생 시 운영 이력을 빠르게 역추적

보여줄 것:
- 최근 감사 로그
- provider fallback
- publish / rollback
- admin actions

비고:
- 지금은 Overview 하단에 짧게 보이고,
- 길게 볼 필요가 생기면 별도 탭으로 확장

## Tabs Proposal

admin 탭은 아래 4개 또는 5개만 유지한다.

1. `Overview`
2. `Data Quality`
3. `Candidate Ops`
4. `Notices`
5. `Audit` (필요 시)

현재 탭과 매핑:

- `status` -> `Overview` + `Data Quality` + 일부 `Candidate Ops`
- `watchlist` -> `Candidate Ops`
- `popup` -> `Notices`
- `portfolio` -> 제거 또는 축소

## What To Remove Or Downgrade

### Remove from admin first view

- 긴 안내 문장
- access stats 상세 카드 전체
- post-launch history 상세 목록
- candidate review 폼 전체
- portfolio profile 편집

### Downgrade

- access stats: 별도 탭 후보가 아니라 필요 시 audit/ops 참고 정보
- post-launch history: Data Quality 하단 접힘 영역
- runtime/database storage: Data Quality 접힘 카드

## Portfolio Admin Direction

현재 `portfolio` 탭은 admin 콘솔 안에서 유지할 이유가 약하다.

이유:
- 제품은 이미 개인 포트폴리오 중심으로 이동했다.
- 포트폴리오 상태는 사용자 영역에서 다루는 것이 더 자연스럽다.
- admin에서 단일 포트폴리오를 만지는 흐름은 운영 핵심보다는 테스트/레거시에 가깝다.

정책:
- short term: 숨김 또는 `internal test only`로 축소
- mid term: 제거

## UX Rules

### Overview

- 첫 화면은 1 screen 안에 끝나야 한다.
- 운영 설명 문단 금지
- `문제 있음 / 주의 / 정상`이 먼저 보여야 한다.

### Data Quality

- count보다 percent 우선
- 상세 파일 경로는 접힘 영역
- 리포트 원문 대신 운영 판단용 요약 먼저

### Candidate Ops

- 종목별 긴 설명 대신
  - ticker
  - name
  - review status
  - watchlist status
  - quick actions
- 행 중심 UI

### Notices

- 설정과 미리보기만
- 다른 운영 정보와 섞지 않음

## Recommended Implementation Phases

### Phase 1

- `status`를 `Overview`로 축소
- 현재 admin 진입 시 first fold를 운영 카드만 남기도록 재구성

### Phase 2

- `Data Quality` 탭 분리
- validation / news / batch / storage 이동

### Phase 3

- `Candidate Ops` 탭으로 후보 리뷰 + watchlist override 통합

### Phase 4

- `portfolio` 탭 제거 또는 internal-only 경로로 축소

## Success Criteria

- 운영자가 admin 첫 화면에서 30초 안에 상태를 판단할 수 있다.
- validation fallback 비율, news fetch 품질, batch 실패 여부가 한눈에 보인다.
- 공통 후보 보정은 별도 탭에서만 이뤄진다.
- popup notice는 다른 운영 정보와 섞이지 않는다.

## Current Priority

문서 기준 다음 admin 작업 우선순위는 아래 순서다.

1. `Overview / Data Quality` 분리
2. `Candidate Ops` 통합
3. `portfolio` 탭 축소 또는 제거
