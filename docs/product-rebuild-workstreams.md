# SwingRadar Product Rebuild Workstreams

## Purpose
This document captures the next product rebuild stages for the authenticated app.

It exists to keep development focused on:
- faster daily use
- denser decision support
- richer review workflows
- less explanatory clutter

## Current diagnosis
The product direction is right, but the logged-in experience still behaves more like:
- a guided website
- a report reader
- a feature explanation surface

than:
- a working dashboard
- a trading journal
- a portfolio operating system

## Target benchmark direction
SwingRadar should not try to become a generic social trading platform first.

The more realistic product target is:
- shared swing signals
- personal execution planning
- personal trading journal
- portfolio review loop

This means we should prioritize:
1. decision speed
2. trade recording
3. position review
4. account-level operating feedback

before:
- social features
- public profile systems
- large community layers

## Workstream 1: App shell simplification
Goal:
- make the logged-in app feel like a tool, not a landing page

Scope:
- shrink the authenticated header into an app bar
- remove hero-style copy from logged-in shell
- simplify navigation to icon + label
- remove verbose helper chips and repeated explanation blocks

Success signal:
- first action is visible immediately after login

## Workstream 2: Today workflow compression
Goal:
- make `Today` readable in seconds

Scope:
- keep only:
  - opening check
  - buy review
  - holding management
- move review insights and secondary explanation below the fold or behind collapse
- reduce text-first cards into count-first and state-first modules

Success signal:
- user can explain what to do today in under 10 seconds

## Workstream 3: Signals workspace densification
Goal:
- make `Signals` a scan surface, not an intro page

Scope:
- keep tabs lightweight
- show tables and filters first
- reduce explanatory cards
- make common-signal and review states easier to scan at a glance

Success signal:
- user can move from opening the page to scanning candidates with no reading step

## Workstream 4: Portfolio tab system
Goal:
- separate current management from history and review

Scope:
- `Holdings`
- `Journal`
- `Reviews`

Rules:
- current holdings should be the default view
- journal should focus on event recording and event history
- reviews should focus on closed positions and lessons

Success signal:
- user does not need to scroll through all portfolio functions to reach current holdings

## Workstream 5: Position detail maturity
Goal:
- make every position feel like a complete operating record

Scope:
- price chart with event markers
- plan vs actual
- opening check record
- trade timeline
- close review

Success signal:
- user can understand one position’s full lifecycle from one screen

## Workstream 6: Calendar and performance review
Goal:
- let users understand account rhythm, not just single names

Scope:
- day calendar
- realized PnL by day/week
- stop-loss frequency
- partial take-profit frequency
- review completion rate
- rule-following indicators

Success signal:
- user can see how their behavior changed over time

## Workstream 7: Strategy and rule analytics
Goal:
- move from logging trades to learning from trades

Scope:
- tag-based review
- setup-type performance
- opening-check decision quality
- risk-reward distribution
- hold-time distribution

Success signal:
- user can answer “what type of trade actually works for me?”

## Not in current scope
The following are valuable, but should not dilute the current rebuild:
- social feed
- public user graph
- copy-trading style loops
- mentor network
- broker sync as a requirement for the first serious version

## Immediate build order
1. app shell simplification
2. Today simplification
3. Signals simplification
4. Portfolio tabs
5. position detail chart and event markers
6. calendar and review dashboard

## Standard
When choosing between:
- more explanation
- or a faster workflow

default to the faster workflow.

When choosing between:
- more feature surface
- or a clearer operating loop

default to the clearer operating loop.
