# SwingRadar Sprint Roadmap

## Purpose
This roadmap reflects the current codebase as of 2026-04-04.

It replaces the older reconstruction that still treated the action-first rebuild as not started.

## Current product position
SwingRadar is now in the late action-first rebuild stage.

The product already supports:
- authenticated tool-like navigation
- shared signals and personal interpretation
- personal opening-check flow
- holdings and trade journal management
- close reviews and promoted personal rules
- performance dashboards and account-level review

The project is no longer blocked by missing product structure.

The main risks now are:
- data quality
- runtime consistency
- operational reliability
- trust in the learning loop

The next product expansion areas are:
- public marketing clarity
- lightweight user-wide activity insight in `Today`

## Sprint status

### Sprint 1: App shell and file snapshot experience
Status: Completed

Delivered:
- recommendations, analysis, and tracking foundations
- file-backed snapshot provider
- initial route and API structure

### Sprint 2: Provider abstraction and safe fallback
Status: Completed

Delivered:
- centralized provider selection
- fallback provider behavior
- curated overlays after provider reads

### Sprint 3: External data ingestion pipeline
Status: Completed

Delivered:
- market fetch
- news fetch
- disclosure fetch
- external raw sync
- snapshot generation

### Sprint 4: PostgreSQL snapshot provider
Status: Completed

Delivered:
- PostgreSQL provider
- ingest pipeline
- runtime switching between storage modes

### Sprint 5: Universe expansion and daily candidate scan
Status: Completed

Delivered:
- symbol import
- universe watchlist build
- batch scan
- daily cycle orchestration
- focused watchlist reporting

Remaining concerns:
- validation and confidence quality still need work

### Sprint 6: Authenticated product repositioning
Status: Completed

Delivered:
- public vs authenticated split
- app shell simplification
- `Today / Portfolio / Signals / Account`
- `Opening Check` as a dedicated workflow
- mobile shell compaction

This sprint closed the biggest product-structure gap.

### Sprint 7: Portfolio operating system
Status: Completed

Delivered:
- holdings / journal / reviews / performance tabs
- trade event recording
- quick holding actions
- undo / reopen flow
- position detail with chart markers
- plan vs actual
- close review notes

### Sprint 8: Review loop and personal rule engine
Status: In progress

Delivered:
- close review templates
- repeated review rule detection
- promote review rules into personal rules
- personal rules in Today and Opening Check
- risk-pattern hints across Today, Signals, and analysis detail
- opening-check quality review analytics

Still open:
- dedicated personal rule management surface
- rule lifecycle visibility
- richer explanation of why a rule changed a suggestion

### Sprint 9: Performance intelligence
Status: In progress

Delivered:
- calendar and weekly/monthly review
- equity curve
- realized PnL summaries
- exit breakdowns
- tag-based performance
- opening-check impact review
- recent strategy wins in Today

Still open:
- deeper rule-violation analytics
- stronger comparative performance views
- clearer strategy cohort comparisons

### Sprint 10: Reliability and operational hardening
Status: In progress

Delivered:
- symbol master runtime split
- validation seed/runtime merge improvements
- measured validation promotion from repeated closed tracking outcomes

Still open:
- lower validation fallback rate
- admin flow verification
- stronger batch failure visibility
- clearer runtime state consistency checks
- explicit external-news policy tightening

## Current recommended sprint
Recommended focus: Sprint 10 reliability and operational hardening

Why this is now the best next step:
- the product loop exists and is usable
- the next trust bottleneck is no longer UI hierarchy
- runtime and data confidence must improve before further surface expansion

## Suggested immediate tasks
1. continue validation pipeline hardening to reduce fallback reliance
2. verify holdings / journal / asset-setting consistency with regression coverage
3. add personal rule management surface
4. document and possibly reduce the role of external news in the decision loop
5. improve admin and batch health diagnostics

## Suggested secondary tasks
1. performance intelligence phase 2
2. rule-violation outcome comparisons
3. stronger cohort summaries for strategy tags
4. rewrite the landing page around marketing promises rather than internal feature explanation
5. add compact anonymous user-activity aggregates to `Today`

## Upcoming product-facing tasks
### Landing page marketing rewrite
Purpose:
- speak to first-time visitors in marketing language
- show what kind of experience the user will have and what benefit that creates
- lead with user-facing outcomes such as:
  - fewer names to watch
  - faster morning decisions
  - less noise and less second-guessing
  - clearer personal action guidance
  - repeatable improvement over time

Constraint:
- admin features must stay out of the landing narrative
- the landing page should not explain what the team improved internally

### Today aggregate user activity signals
Purpose:
- show lightweight anonymous behavior summaries from all users

Examples:
- today's most attempted buy
- most widely held name
- most watched opening-check candidate

Constraint:
- keep these modules compact and secondary to the user's own action cards

## Notes
- `docs/authenticated-app-ui-rules.md` remains the source of truth for logged-in screen behavior.
- `docs/product-rebuild-workstreams.md` is now the better operational companion to this roadmap.
- This roadmap should be updated whenever:
  - a workstream changes status
  - a reliability milestone materially improves trust
  - a new rule-management or review-management surface ships
