# SwingRadar Public Beta Dry Run Checklist

## Goal
Run a small private beta in a controlled way before opening the service to a wider free audience.

## Recommended scale
- Internal rehearsal only: `3 internal accounts / 3 trading days`
- First pilot: `10 users / 5 trading days`
- Private beta dry run: `20 users / 10 trading days`

Move to the next stage only after the current stage stays stable for the full window.

## 1. Before inviting users
- Confirm `/admin` shows both `Service Readiness` and `Prelaunch Dry Run` as non-blocked.
- Confirm contact, terms, privacy, and disclaimer pages are live in the footer.
- Confirm login, logout, session revoke, popup notice, and tutorial replay all work on one real account.
- Confirm one portfolio account can complete:
  - `Today -> Opening Check -> Portfolio trade record -> Reviews`
- Prepare one operator contact channel:
  - email inbox, chat room, or issue tracker
- Prepare a single place to collect feedback:
  - audit note, GitHub issue, or shared spreadsheet

## 2. Daily operator checks
- Check `/admin` overview after the daily cycle completes.
- Check `validation fallback`, failed batch count, and news live fetch ratio.
- Open one real user account and confirm:
  - Today cards load
  - Signals render without broken empty states
  - Portfolio journal save/undo still works
- Review the latest audit log and write down any manual operator actions.
- Review new feedback from pilot users and label each item:
  - bug
  - trust/data issue
  - onboarding confusion
  - mobile usability

## 3. User support drill
- At least once during the dry run, rehearse:
  - popup notice update
  - session revoke for a test user
  - one tutorial replay from account settings
  - one portfolio consistency warning review
- If something fails, do not widen the pilot group until the issue is fixed and re-tested.

## 4. Data trust drill
- Sample 3 recommended tickers each day.
- For each ticker, confirm the user-facing trust summary is understandable:
  - measured vs tracking vs fallback basis
  - recent pattern strength
  - why status was lowered
- If users cannot explain the trust summary back in their own words, improve copy before widening access.

## 5. Mobile drill
- Check at least one iPhone-sized viewport and one Android-sized viewport.
- Confirm no overlap or clipping in:
  - header
  - Today
  - Analysis trade plan
  - Portfolio reviews
  - Position detail
- If any core action needs horizontal scrolling or hidden controls, treat it as a launch blocker.

## 6. Exit criteria for wider free launch
- No critical incident during the last `5 trading days`
- No unresolved portfolio state consistency bug
- Daily cycle and auto-heal reports keep updating
- Contact/support path is visible in product
- Tutorial, popup notice, and mobile core screens remain stable
- Pilot feedback is being handled within one business day

## 7. If the dry run goes badly
- Pause new invites immediately.
- Put a popup notice in the product if the issue is user-visible.
- Log the failure in audit/admin notes.
- Reduce back to internal rehearsal until the issue is fixed and re-verified.
