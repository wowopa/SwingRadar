# SwingRadar Authenticated App UI Rules

## Purpose
These rules define how the logged-in product should behave.

The authenticated app is not a landing page, a feature tour, or a long-form report.
It is a working surface for daily trading decisions.

## Core principle
When the user is logged in, every screen should help them:
- decide faster
- scan faster
- record faster
- review faster

If a logged-in screen makes the user read before they can act, the screen is carrying too much explanation.

## Product distinction
### Public experience
- Can be emotional
- Can tell the product story
- Can use large hero copy
- Can explain the philosophy

### Authenticated experience
- Must be compact
- Must privilege action over explanation
- Must use short labels over marketing copy
- Must feel like a tool, not a website

Rule:
- never reuse landing-page hero language inside the logged-in shell

## Shell rules
### Header
- The logged-in header is an app bar, not a hero section.
- Keep it to:
  - brand
  - primary navigation
  - search
  - account menu
- Do not place large marketing headlines inside the authenticated header.
- Do not place explanatory chips in the authenticated header.

### Navigation
- Navigation items should use icon + label by default.
- Do not show descriptive subtitles under nav items in the default view.
- If additional explanation is needed, use tooltip, onboarding, or help entry points.
- Navigation should communicate location first, explanation second.

## Copy budget
### Above-the-fold rules
- In the first 700px of a logged-in screen, allow at most one short explanatory paragraph.
- Do not stack:
  - page intro
  - status explanation
  - process explanation
  - card-level explanation
  all in the same opening viewport.

### Card rules
- Card titles should be noun- or action-led.
- Body copy should usually stay within 1 to 2 lines.
- Long guidance belongs in:
  - expandable details
  - tooltips
  - modal help
  - secondary detail pages

### Status rules
- Use badges, counts, icons, and layout to explain state before using sentences.
- Prefer:
  - `장초 확인 3개`
  - `매수 검토 1개`
  - `즉시 점검 2개`
- Avoid sentence-first explanations when a count or badge can say the same thing.

## Dashboard rules
### Today
The first screen should answer only:
1. What do I need to do now?
2. How many items require attention?
3. Where do I go next?

The top of `Today` should contain only:
- opening check
- buy review
- holding management

Do not place review analytics, long status explanations, or process education above these cards.

### Opening Check
This is a processing screen, not a reading screen.

The first view should show:
- current ticker
- 3 inputs
- suggested result
- save / save-and-next

Keep supporting guidance collapsed by default.

### Signals
This is a scanning screen.

The first view should show:
- tab selection
- filter bar
- table or list

Do not place a large explanatory intro above the working table.

### Portfolio
This is a management screen.

Prefer tabs over long vertical stacking when mixing:
- holdings
- journal
- reviews

Default view should focus on current holdings first.
Closed trade review and journal detail should be one step deeper.

## Space and scrolling rules
- Do not force scrolling just to reach the first actionable control.
- Any screen that requires more than one viewport before the first useful action should be reconsidered.
- Repeated explanatory sections should be removed or collapsed.
- If a screen grows because multiple jobs are mixed together, split the jobs into tabs or dedicated pages.

## Visual hierarchy rules
- Brand color is for identity and primary emphasis.
- Status colors are for:
  - positive
  - watch
  - caution
- Neutral surfaces should remain quiet.
- Do not use the same emphasis level for:
  - section description
  - active selection
  - warning status
  - primary CTA

## Reference behaviors to emulate
### Trade journal products
- Compact dashboard first
- Drill-down detail second
- Rich review only after the summary layer

### Portfolio trackers
- Overview first
- filters and graph controls nearby
- holdings table immediately visible
- closed positions optional, not dominant

### Watchlists / screeners
- Dense scan surface
- fast sorting
- clear active row and selected state
- minimal decorative text around the working list

## Anti-patterns
Do not introduce:
- landing-page copy in the authenticated shell
- descriptive subtitles under every navigation item
- explanatory paragraphs above every card
- “helper” sections that repeat what the badges already say
- long data freshness explanations above the work surface
- stacked cards that only translate the same state into prose

## Review checklist
Before shipping a logged-in screen, confirm:
1. Is the first useful action visible without scrolling?
2. Can the user understand the screen in under 5 seconds?
3. Can any paragraph become a badge, count, or tooltip?
4. Is the screen doing only one main job?
5. Is any large section merely repeating what another section already says?
6. Would this still feel good if all explanatory paragraphs were hidden?

If the answer to 6 is no, the hierarchy is still too text-dependent.
