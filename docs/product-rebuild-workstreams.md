# SwingRadar Product Rebuild Workstreams

## Purpose
This document tracks the authenticated product rebuild from the current codebase state.

It should answer:
- what is already rebuilt
- what is only partially complete
- what should be prioritized next

## Current product state
SwingRadar is no longer just a ranked-idea dashboard.

The logged-in product now has a usable operating loop:
1. shared signals
2. personal opening check
3. today action decisions
4. holdings and trade recording
5. close reviews
6. performance and rule feedback

That means the rebuild has moved past:
- shell cleanup only
- copy cleanup only
- one-page dashboard iteration

The next bottleneck is now:
- reliability
- data quality
- state consistency
- learning-loop trust
- clearer product marketing for non-users
- lightweight social proof in the daily operating loop

## Status by workstream

### Workstream 1: App shell simplification
Status: Completed

Delivered:
- authenticated shell reduced into an app bar
- mobile shell compacted
- navigation simplified to tool-like labels
- landing-style copy removed from logged-in surfaces

Success signal:
- first useful action is visible immediately after login

### Workstream 2: Today workflow compression
Status: Completed

Delivered:
- `Today` focuses on:
  - opening check
  - buy review
  - holding management
- secondary guidance moved below the fold or behind details
- personal rules and repeated violation warnings surfaced without turning the page back into prose

Success signal:
- the user can explain what to do today in seconds

### Workstream 3: Signals workspace densification
Status: Completed

Delivered:
- `Signals` works as a scan surface
- quick views exist:
  - all
  - personal only
  - buy review only
  - opening-check candidates
- shared signal vs personal interpretation is visible in the table and detail view

Success signal:
- users can move directly into scanning without reading a long intro

### Workstream 4: Portfolio tab system
Status: Completed

Delivered:
- `Holdings`
- `Journal`
- `Reviews`
- `Performance`

Delivered behavior:
- current holdings remain the default management surface
- trade recording no longer forces the user through a long vertical page
- reviews and performance are separated from current holdings

### Workstream 5: Position detail maturity
Status: Completed

Delivered:
- price chart with event markers
- plan vs actual section
- opening-check insight connection
- trade timeline
- close review editor

Success signal:
- one position can be understood as a full lifecycle from one screen

### Workstream 6: Calendar and performance review
Status: Completed

Delivered:
- review calendar
- weekly and monthly PnL summaries
- realized PnL flow
- equity curve
- exit breakdown
- tag-based and reason-based summaries

Success signal:
- account rhythm is visible, not just single names

### Workstream 7: Strategy and rule analytics
Status: In progress

Already delivered:
- opening-check decision quality review
- repeated review rule candidates
- personal rule promotion
- personal rule reminders in `Today`
- rule-aware opening-check suggestion downgrades
- risk-pattern hints in `Today`, `Opening Check`, `Signals`, and analysis detail

Still missing:
- explicit personal rule management screen
- rule enable/disable states
- rule priority / confidence controls
- rule history and "why this rule was applied" tracing

### Workstream 8: Recording speed and state consistency
Status: In progress

Already delivered:
- quick actions from holdings
- trade dialog presets
- recent note and strategy-tag reuse
- undo / reopen flow for last trade
- follow-up routing after save

Still missing:
- broader consistency hardening between:
  - journal
  - holdings
  - asset settings
  - cash balance
- richer edit history for recently recorded events
- stronger regression tests around trade write paths

### Workstream 9: Operational reliability and data quality
Status: In progress

Already delivered:
- symbol master runtime split
- validation snapshot merge improvements
- measured validation promotion from repeated tracking outcomes

Still missing:
- lower validation fallback rate
- stronger admin flow verification
- clearer batch failure visibility
- explicit news policy simplification
- better confidence around runtime state sync

### Workstream 10: Public landing repositioning
Status: Planned

Goal:
- rewrite the landing page for first-time visitors, not existing users
- remove admin-oriented, internal, or implementation-focused explanations
- express the product through the user experience and resulting advantages

Scope:
- describe the experience a user gets:
  - fewer names to watch in the morning
  - less hesitation about what to do first
  - a tighter rhythm between planning, execution, and review
- describe the resulting benefit:
  - faster morning decisions
  - reduced noise and over-scanning
  - clearer personal action guidance
  - more repeatable improvement over time
- exclude internal admin features from the public story
- avoid talking about product restructuring or what the team has improved
- avoid long explanation blocks; prefer short marketing language and visual proof

Success signal:
- a new visitor can quickly imagine how their decision-making experience gets better by using the product

### Workstream 11: Today social proof and aggregate behavior
Status: Planned

Goal:
- add lightweight user-wide activity signals to `Today`
- show what other users are actually doing without turning the product into a social feed

Scope:
- simple aggregate modules such as:
  - today's most attempted buy
  - most widely held name
  - most frequently reviewed holding
  - top opening-check watch name
- keep this anonymous and summary-based
- avoid direct copying pressure or gamified social ranking

Design constraints:
- these modules should stay compact
- they should support the user's own decision flow, not interrupt it
- they belong below the primary action cards, not above them

Success signal:
- `Today` feels more alive and credible without becoming noisy or socially distracting

## What is no longer the main problem
These are no longer the primary bottlenecks:
- landing-page style copy inside the authenticated app
- lack of portfolio tabs
- lack of trade journal support
- lack of close review workflows
- lack of personal learning feedback

## Current priority stack
The rebuild should now prioritize the following in order.

### 1. Operational reliability and data quality
Why:
- trust can fail even when the UX looks good
- validation fallback is still too high
- runtime data pipelines need more confidence than they currently have

Focus:
- validation pipeline phase 3
- clearer news role reduction
- admin and batch flow verification
- runtime report and failure visibility

### 2. Recording speed and state consistency
Why:
- the service is now only as strong as the accuracy of the user's recorded trade history

Focus:
- holdings/journal/profile state sync
- faster post-trade edits
- better regression coverage for overwrite, undo, and reopen flows

### 3. Personal rule engine maturity
Why:
- rules now influence the workflow, but the user still cannot manage them as a first-class system

Focus:
- rule list
- enable/disable
- rule source visibility
- rule application explanation

### 4. Performance intelligence phase 2
Why:
- the performance surface is now useful enough to benefit from deeper comparative insight

Focus:
- rule violation outcomes
- opening-check combination comparisons
- stronger period comparisons
- better tag and exit pattern interpretation

### 5. Public landing marketing rewrite
Why:
- the landing page must sell the user experience, not explain internal product evolution

Focus:
- marketing-first messaging around the user experience and the resulting benefit
- stronger hero framing for first-time visitors
- removal of admin/internal product language
- compact, high-signal sections instead of explanatory blocks

### 6. Today aggregate user activity signals
Why:
- small amounts of anonymous social proof can improve confidence and relevance

Focus:
- compact "most attempted", "most held", and similar daily aggregates
- clear placement below the core action cards
- anonymous, non-gamified presentation

## Not in near-term scope
The following are still intentionally out of scope for the current rebuild:
- social trading
- public profile graph
- mentor marketplace
- broker sync as a hard dependency
- embedded live market data as a required feature

## Immediate next build order
1. operational reliability and data quality hardening
2. journal / holdings / asset-setting consistency hardening
3. personal rule management surface
4. performance intelligence phase 2
5. landing marketing rewrite
6. Today aggregate user-activity signals

## Standard
When choosing between:
- another insight surface
- or a more reliable operating loop

default to the more reliable operating loop.

When choosing between:
- richer explanation
- or more trustworthy state and faster recording

default to trustworthy state and faster recording.
