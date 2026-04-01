# SwingRadar Service Operating Model

## Positioning
SwingRadar should move from an analysis-heavy dashboard into an action-first swing trading service.

The product should no longer feel like:
- a long research report
- an analyst workstation
- a large feed of loosely ranked ideas

The product should feel like:
- a daily decision system
- a disciplined swing operating playbook
- a portfolio-aware service that tells the user what deserves action now

## Core user promise
Every core screen should help the user answer five questions quickly:
1. What should I do today?
2. Which names are actionable now?
3. Where is the entry zone?
4. Where do I cut the loss if I am wrong?
5. Where do I start taking profit if I am right?

If a screen does not make one of those answers clearer, it is secondary.

## Product outcome
The service should optimize for clarity and survivability, not idea volume.

Primary outcome:
- show fewer names
- make each name more actionable
- reduce impulsive chase trades
- guide users with portfolio rules, not only stock analysis

Secondary outcome:
- preserve expert depth for users who want to inspect the reasoning
- keep rich diagnostics available through progressive disclosure

## Experience principle
The default user journey should be:
1. Read today's operating summary.
2. See whether the market is in attack, neutral, or defense mode.
3. Review at most a small number of actionable ideas.
4. Know exactly which names are buy now, watch only, manage, or avoid.
5. Execute based on a clear risk budget and exit plan.

The app should never force the user to reverse-engineer its intent from raw scores.

For logged-in screen composition rules, see:
- `docs/authenticated-app-ui-rules.md`

## Decision hierarchy
The system should make decisions in this order.

### 1. Market regime
Each day starts with a regime call:
- `attack`: broad participation, trend support, and risk-on conditions
- `neutral`: mixed conditions, selective entries only
- `defense`: poor breadth, failed breakouts, elevated downside risk

The regime should control how much new risk is allowed.

### 2. Portfolio capacity
Before selecting names, the app should determine:
- how many new positions are allowed today
- how many total positions can be open
- whether the portfolio already has too much sector concentration

This prevents "too many good ideas" from turning into overtrading.

### 3. Action bucket
Every candidate should be placed into one of four user-facing buckets:
- `Buy now`
- `Watch only`
- `Manage open position`
- `Avoid for now`

The bucket is more important than the raw score.

### 4. Trade plan
Each actionable name should include:
- entry zone
- stop level
- first take-profit area
- expected holding window
- recommended risk size

### 5. Supporting diagnostics
Only after the action plan is clear should the user see:
- score logs
- detailed factor notes
- historical appearance counts
- news and disclosure context

## Portfolio operating rules
The shared product should behave more like a disciplined model portfolio than a scanner.

### Exposure rules
- Default concurrent positions: `4 to 6`
- Default same-sector cap: `2`
- Daily new entries:
  - `attack`: up to `2 or 3`
  - `neutral`: up to `1`
  - `defense`: `0 or 1`, usually watch only

### Risk rules
- Risk per position should be based on portfolio loss tolerance, not cash split.
- Suggested shared baseline: `0.5% to 1.0%` of portfolio risk per idea
- Position size formula:
  - `position size = allowed portfolio loss / stop distance`

### Entry rules
An idea should only move into `Buy now` when:
- structure is intact
- liquidity is sufficient
- chase-risk is acceptable
- a defined trigger is present

Preferred trigger types:
- breakout through confirmation level
- pullback into support with renewed demand
- reclaim after controlled shakeout

### Exit rules
The product should make sell rules explicit:
- hard stop at the invalidation level
- time stop if expansion does not happen within the expected window
- partial take-profit at the first reward target
- trailing management for the remainder if trend persists

### Replacement rules
New ideas should not simply stack on top of existing ones.

If the portfolio is full, the service should ask:
- Is the new setup stronger?
- Is the current holding stale?
- Does the swap improve expected reward versus risk?

This creates a replacement mindset instead of unlimited accumulation.

## Language policy
Internal operating vocabulary can remain in the system, but user-facing labels should be plain.

| Internal term | User-facing term | Why |
| --- | --- | --- |
| Candidate board | Today page | Puts the day first |
| Ranking score | Priority | Easier to interpret |
| Activation score | Watch priority | Describes the use |
| Public tracking | Service watchlist | Sounds operational, not technical |
| Entry tracking | Buy now | Tells the user what it means |
| Invalidation price | Stop level | Common trading language |
| Recommendation tone | Judgment | More human and direct |

Rule:
- show action words by default
- keep scoring terms in expandable detail only

## Screen intent
Each major screen should have a single job.

### `/recommendations`
This should become the daily operating home.

It should answer:
- How aggressive should I be today?
- How many new names can I act on?
- Which few names deserve attention first?

### `/tracking`
This should become the position and watch management surface.

It should answer:
- What am I already managing?
- Which names are still watchable?
- Which names should be avoided because they are extended or broken?

### `/ranking`
This should become the advanced explorer, not the default starting point.

It is useful for power users, but it should not carry the burden of making the primary decision.

### `/analysis/[ticker]`
This should become a decision memo for one name.

It should lead with:
- action bucket
- entry zone
- stop level
- first target
- why now versus why not now

### `/guide`
This should become a 60-second onboarding page.

It should explain:
- this is not a service that tells you to buy everything
- the service narrows the field into a small number of disciplined actions
- scores are inputs, not the final instruction

## Premium path
The same operating model can support premium expansion later.

### Phase 1: shared action-first service
- shared regime call
- shared buy now and watch lists
- shared exit framework

### Phase 2: model portfolios by capital band
- small account template
- medium account template
- large account template

### Phase 3: personalized risk templates
- user-defined max positions
- user-defined risk per trade
- account-specific position sizing

### Phase 4: premium managed guidance
- personalized model allocation
- risk alerts based on current holdings
- replacement suggestions based on capital usage

## Success metrics
The product should be measured by decision quality, not content volume.

Key measures:
- users can explain today's action plan in under 30 seconds
- users know how many names they are allowed to act on
- average visible actionable names stays low and intentional
- chase-trade inclusion rate keeps falling
- time from landing to first confident decision goes down
- users can explain stop and take-profit levels without reading long notes

## Operating standard
When there is a conflict between more analysis and more clarity, default to clarity.

When there is a conflict between more ideas and better risk control, default to risk control.

SwingRadar should earn trust by being selective, legible, and disciplined.
