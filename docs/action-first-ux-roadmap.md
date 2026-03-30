# SwingRadar Action-First UX Roadmap

## Goal
Turn the current app into a product that answers:
"What should I do now?" faster than it answers:
"How does this scoring system work?"

## Product diagnosis
The current experience still feels closer to a research console than a guided decision product.

Observed friction:
- too many internal terms appear in primary UI
- screens explain data, but do not always tell the user what action to take
- too many names can look equally important
- portfolio rules are implied, not explicit
- the app explains stocks one by one more clearly than it explains how to manage a full account

## Design principles
### 1. Action before explanation
Lead with action bucket, entry, stop, and target.

### 2. Portfolio before stock list
Tell the user how many positions are allowed before showing ideas.

### 3. Fewer names, stronger intent
The UI should cap visible actionable names.

### 4. Plain words first
Replace internal analytics language on default screens.

### 5. Progressive disclosure
Keep rich logs and metrics available, but behind details.

### 6. One screen, one job
Every page should have a single primary question it answers.

## Target information architecture
### Home route
Keep routing users into `/recommendations`, but treat it as the daily operating home.

### Daily home sections
Recommended order:
1. `Today's stance`
2. `How many new positions are allowed`
3. `Buy now`
4. `Watch only`
5. `Manage existing`
6. `Avoid for now`
7. `Why the stance is cautious or aggressive`

### Supporting pages
- `/tracking`: management workspace
- `/ranking`: advanced idea explorer
- `/analysis/[ticker]`: one-name decision memo
- `/guide`: onboarding for first-time users

## Screen-by-screen direction
### `/recommendations`
Current role:
- candidate feed and scan summary

New role:
- the daily operating homepage

What should appear above the fold:
- market regime banner
- today's operating sentence
- max new entries
- max total positions
- count of buy-now ideas
- count of watch-only ideas

Primary cards should show:
- action bucket
- ticker and company
- entry zone
- stop level
- first target
- estimated holding window
- suggested risk size
- one-sentence reason

Strict content rule:
- default visible buy-now ideas: `0 to 3`
- default visible watch-only ideas: `3 to 5`
- everything else belongs behind a secondary action

### `/tracking`
Current role:
- public tracking history and detail inspection

New role:
- manage what is active, watched, closed, or avoided

Recommended tabs:
- `Manage open`
- `Watch only`
- `Closed`
- `Avoided or extended`

For each card, show:
- current status
- days in trade or watch
- distance to stop
- distance to first target
- next required action
- reason if the name is blocked

### `/ranking`
Current role:
- score-based list of ideas

New role:
- advanced explorer for power users

Rules:
- do not send first-time users here first
- keep raw scores, but clarify that rank is not equal to permission to buy
- add filters for action bucket, regime fit, liquidity, and chase risk

### `/analysis/[ticker]`
Current role:
- deep stock analysis

New role:
- decision memo

Recommended order:
1. action bucket
2. trade plan
3. why now
4. why not now
5. chart and structure
6. detailed factor notes
7. score log

Mandatory action module:
- entry zone
- stop level
- first target
- stretch target
- expected hold days
- risk-reward view

### `/guide`
Current role:
- feature tour

New role:
- 60-second onboarding

The page should answer:
- What this product does
- What it does not do
- Why users should not buy every highlighted stock
- How many names a user should act on
- What each action bucket means

## Data and model changes needed
The UX change requires more than copy.

Needed fields:
- `marketRegime`
- `dailyActionSentence`
- `maxNewPositions`
- `maxConcurrentPositions`
- `actionBucket`
- `entryZoneLow`
- `entryZoneHigh`
- `stopPrice`
- `targetPrice1`
- `targetPrice2`
- `expectedHoldDays`
- `riskPerTradeTemplate`
- `portfolioSlotCost`
- `sectorExposureTag`
- `blockReason`
- `replacementPriority`

## Shared operating rules to encode
### Regime gate
- `attack`: new entries allowed
- `neutral`: selective entries only
- `defense`: mostly watch or manage

### Position cap
- max concurrent positions: `4 to 6`
- max same-sector positions: `2`

### Selection cap
- visible buy-now ideas: `0 to 3`
- visible watch-only ideas: `3 to 5`

### Risk budget
- default per-trade risk: `0.5% to 1.0%`

### Exit policy
- hard stop
- time stop
- partial take-profit
- runner management

### Replacement logic
- if a better setup appears when full, prompt a swap decision

## Suggested rollout phases
### Phase 1: language and hierarchy
Scope:
- rename user-facing labels
- surface action bucket on key cards
- add today's operating summary
- limit visible idea count

Success test:
- a new tester can explain what to do today in under one minute

### Phase 2: trade-plan UI
Scope:
- add entry, stop, target, and hold-window modules
- reorder analysis pages around action
- add clear block reasons on non-actionable names

Success test:
- a tester can say where they would buy and where they would exit

### Phase 3: portfolio engine
Scope:
- regime-aware caps
- position limit logic
- sector concentration guardrails
- replacement prompts

Success test:
- a tester can explain why they are buying only one or two names instead of many

### Phase 4: premium-ready personalization
Scope:
- account-size templates
- user risk settings
- personalized position sizing
- premium model portfolio views

Success test:
- the same engine can support different capital bands without changing the core UX

## Suggested engineering backlog
### UI
- redesign `/recommendations` as daily operating home
- redesign `/guide` as onboarding
- simplify labels in shared components
- add action bucket badges everywhere

### Contracts
- extend recommendation and tracking DTOs with trade-plan fields
- add regime and portfolio-cap metadata

### Snapshot generation
- compute action bucket after regime and chase filters
- compute entry/stop/target outputs
- compute block reasons and replacement priority

### Testing
- add snapshot tests for action bucket rendering
- add service tests for regime-driven caps
- add usability acceptance checklist for language clarity

## Research and validation loop
Each usability round should test these prompts:
- "What should you do today?"
- "How many new names would you buy?"
- "Why is this name watch only and not buy now?"
- "Where would you stop out?"
- "What would make you skip this stock?"

If users cannot answer those without coaching, the screen is still too analytical.
