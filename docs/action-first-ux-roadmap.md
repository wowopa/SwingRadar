# SwingRadar Action-First UX Roadmap

## Goal
Turn the current app into a product that answers:
"What should I do now?" faster than it answers:
"How does this scoring system work?"

Authenticated app composition and copy rules are codified in:
- `docs/authenticated-app-ui-rules.md`

## Current status
Most of the original action-first rebuild is now shipped.

Already implemented:
- authenticated app-bar shell
- `Today / Portfolio / Signals / Account`
- dedicated `Opening Check`
- personal action interpretation layered on shared signals
- portfolio tabs with journal, reviews, and performance
- close reviews feeding personal rules back into daily flow

This roadmap should now be read as:
- a reference for the original action-first design intent
- plus a reminder that the next UX gains come from reliability and density, not more explanation

## Product diagnosis
The current experience still feels closer to a research console than a guided decision product.

Observed friction:
- too many internal terms appear in primary UI
- screens explain data, but do not always tell the user what action to take
- too many names can look equally important
- portfolio rules are implied, not explicit
- the app explains stocks one by one more clearly than it explains how to manage a full account
- the landing page still needs stronger marketing framing for non-logged-in users
- `Today` could benefit from compact anonymous social proof without becoming a feed

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
- `/opening-check`: fast processing surface for the morning loop
- `/portfolio`: holdings, journal, reviews, performance
- `/signals`: shared-signal scan surface
- `/analysis/[ticker]`: one-name decision memo
- `/guide`: onboarding for first-time users

### Public landing direction
The landing page should now:
- reflect the improved authenticated UX
- avoid admin and internal operating language
- market the product through user outcomes, not feature inventory

Recommended public message:
1. reduce the number of names to watch
2. make the morning routine shorter
3. connect planning, execution, and review
4. help users improve through repetition and feedback

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

Additional direction:
- below the core action cards, allow a compact anonymous aggregate strip with examples like:
  - most attempted buy today
  - most widely held name
  - most watched opening-check name
- this strip must stay secondary and should never push the primary action cards below the fold

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
Status: Completed

Delivered:
- shorter labels
- action-first top sections
- smaller logged-in shell
- lower explanatory clutter

### Phase 2: trade-plan UI
Status: Completed

Delivered:
- entry / stop / target emphasis
- analysis pages reordered around action
- non-actionable names explained through interpretation layers

### Phase 3: portfolio engine
Status: Completed

Delivered:
- account-aware action planning
- position and sector constraints
- journal, reviews, performance
- personal rules flowing back into daily decisions

### Phase 4: reliability and learning-loop trust
Status: In progress

Scope:
- validation quality
- holdings/journal/profile consistency
- personal rule management
- stronger reason visibility when suggestions are downgraded

Success test:
- users trust that what they recorded, reviewed, and learned is accurately reflected the next day

## Suggested engineering backlog
### Reliability
- continue validation pipeline hardening
- reduce fallback-heavy recommendation support
- make external news explicitly optional and lower-impact

### Data consistency
- harden journal / holdings / asset-setting sync paths
- add stronger regression coverage around undo, reopen, and overwrite flows

### Rule engine
- add dedicated personal rule management surface
- show rule source, status, and application reason

### Performance intelligence
- add deeper rule-violation outcome analysis
- add stronger tag-cohort comparisons
- improve comparative period review

### Public and community-facing signals
- rewrite the landing page around benefits and marketing promises
- add compact anonymous user-activity summaries to `Today`
- do not turn the app into a social feed or public leaderboard

## Research and validation loop
Each usability round should test these prompts:
- "What should you do today?"
- "How many new names would you buy?"
- "Why is this name watch only and not buy now?"
- "Where would you stop out?"
- "What would make you skip this stock?"

If users cannot answer those without coaching, the screen is still too analytical.
