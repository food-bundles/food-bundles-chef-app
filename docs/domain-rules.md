# Domain rules (Phase 9)

These are the business rules of the chef app, as set by the Food Bundles UX spec (Nov 18, 2026):
- `mobile/.claude/docs/ux/Chef App — Concept Notes per Screen.pdf`
- `mobile/.claude/docs/ux/Chef App — Screen UX (Food Bundles).pdf`

**They supersede the older rules** below, wherever older instructions, skills or code still use them:
- the "four-week weighted demand, latest week 40 %, previous weeks 20 %, 10 % buffer" policy;
- the separate Sales Entry flow.

All of these calculations are deterministic code (Python on the server, TypeScript in `mobile/src/domain/`). Quantities and money use Decimal. AI never produces them.

## The three jobs and the data they share

The chef does three jobs a day: **receive the delivery → handle commands → make tomorrow's requisition**. The menu recipe drives everything: each dish lists its ingredients and the quantity used for 1 portion. Quantities are in the ingredient's base unit (kg, L, pcs).

## Formulas

| Name | Formula | Notes |
|---|---|---|
| Stock left | `opening + received − Σ(portions accepted × recipe qty)`, then count adjustments | Today's left is tomorrow's opening |
| Can make (dish) | `min over its ingredients of floor(stock left ÷ recipe qty)` | An ingredient with recipe qty 0 is ignored. A dish with no recipe lines cannot deduct stock and shows no "can make" |
| Ordered today (dish) | portions of that dish in all commands since opening | Excludes `ORDERED_TODAY_EXCLUDES` (cancelled, declined) |
| Expected use tomorrow (ingredient) | `Σ over dishes(avg portions on the last N same weekdays × recipe qty) × (1 + buffer) ÷ yield + qty short on declined commands` | See the requisition rules below |
| Suggested qty | `max(0, expected use − stock left)`, rounded **up** to the FB pack size | |
| Cost per portion | `Σ(recipe qty × FB price per unit)` | Updates when FB prices change |
| Margin | `selling price − cost per portion`, and `margin ÷ selling price` as % | |
| Low stock | amber when left < `STOCK_LOW_FACTOR` × one service's average use; red when left < `STOCK_VERY_LOW_FACTOR` × that use | One service's average use = average daily use over the last 7 days the kitchen was open |

**Requisition details:**
- "Same weekdays" means the weekday the requisition is for (tomorrow). Only days with at least one command count as days the kitchen was open.
- The average divides by the number of those days, at most N. With no such day, expected use is 0 and only declined shortages are suggested.
- `buffer` (`REQUISITION_SAFETY_BUFFER_PCT`, default 0) and `yield` (`REQUISITION_YIELD`, default 1, not shown in the app) let us tune without code changes if kitchens run short.

**Worked examples from the mockups (they are test cases):**
- **Stock:** Chicken 1.0 + 5.0 − 4.1 = 1.9 kg.
- **Requisition** (pack 1 kg / 1 L):
  - Chicken: need 5.9, left 1.9 → 4 kg × 4,500 = 18,000.
  - Cooking banana: 14 − 8.4 = 5.6 → 6 kg × 400 = 2,400.
  - Rice: 7.6 − 4.9 = 2.7 → 3 kg × 1,500 = 4,500.
  - Carrots: 0.9 − 0.1 = 0.8 → 1 kg × 800 = 800.
  - Cooking oil: 0.7 − 0.2 = 0.5 → 1 L × 3,000 = 3,000.
  - Total: **28,700 RWF**.
- **Boilo cost per portion:** 0.25 × 4,500 + 0.30 × 400 + 0.20 × 600 + 0.05 × 800 + 0.03 × 1,200 + 0.02 × 3,000 = **1,501**. Margin at 7,000 = **5,499 (78.6 %)**.
- **Decline:** 3 × Chicken Legs at 0.3 kg chicken each. Need 0.9, have 0.6, short 0.3 → "Accept 2 of 3".

## Commands

**Status:**
- New → Cooking → Served (Dine-in) or Handed (To go).
- New → Declined.
- Cooking → Cancelled.
- Every other transition is rejected.

**Who and where:**
- **Who records:** `COMMAND_RECORDER_ROLES` (chef, waiter, cashier).
- **Staff:** names and roles per kitchen, picked on the chef's phone for "Recorded by". Separate staff logins are a follow-up.
- **Starting status:** recorded by a role in `COMMAND_NEW_STATUS_ROLES` (waiter, cashier) → **New**, waiting for the chef's stock check and Accept. Recorded by the chef → straight to **Cooking**.

**Stock movements:**
- Accepting, or recording straight to Cooking, deducts the recipe (`COMMAND_DEDUCT_ON = accept`).
- Declining deducts nothing.
- Cancelling an accepted command puts its ingredients back.
- Accepting part of a command ("Accept X of Y") deducts X portions; the rest is declined with the same reason.

**Numbering:**
- Commands run #001, #002, … from each opening (`COMMAND_NUMBER_RESET = each_opening`) and cannot be edited.
- A command recorded offline gets a provisional number; the server assigns the final one.

**Decline:**
- The restaurant message reads "Declined – not enough Chicken (short 0.3 kg)."
- "Add missing items to tomorrow's requisition" is on by default. Those shortages are added to expected use.

## Home state (calculated, never stored)

`homeState(now, openingTime, closingTime, deliveryConfirmedToday, endServiceTapped)`:
- `end_of_day` if `endServiceTapped`, or `now ≥ closingTime`;
- otherwise `service` if `deliveryConfirmedToday` (received or skipped) and `now ≥ openingTime`;
- otherwise `before_service`.

Opening and closing times are per kitchen, in the kitchen's time zone. The "End of day · Make requisition" button on Stock is the "End service" tap.

## Receiving

- A Food Bundles order arrives pre-filled from yesterday's requisition. The received quantity starts empty, so the chef must weigh.
- Each line is Good or Issue. Issue reasons: short weight, damaged, not fresh, plus a photo.
- Confirm adds received quantities to today's "In".
- Confirm is allowed with unchecked items, after a warning. Unchecked items count as not received.
- Items bought elsewhere are valued at the FB price. A custom item not in the catalogue keeps the chef's own price, labelled as such.

## Configuration (spec defaults; to be confirmed by the spec author)

| Setting | Default | Spec decision |
|---|---|---|
| `COMMAND_DEDUCT_ON` | `accept` | Stock is deducted when a command is accepted, not when served |
| `COMMAND_KEEP_COOKING_STEP` | `true` | Keep the Cooking step between accepted and served |
| `COMMAND_NEW_STATUS_ROLES` | `["waiter", "cashier"]` | Commands recorded by the chef skip New |
| `ORDERED_TODAY_EXCLUDES` | `["cancelled", "declined"]` | "Ordered today" excludes cancelled and declined |
| `COMMAND_NUMBER_RESET` | `each_opening` | Numbers restart at #001 each opening |
| `REQUISITION_SAME_WEEKDAYS` | `7` | Last 7 same weekdays |
| `REQUISITION_ROUND_TO_PACK` | `true` | Rounded up to the FB pack size |
| `REQUISITION_SAFETY_BUFFER_PCT` | `0` | Not in the spec; for tuning |
| `REQUISITION_YIELD` | `1` | Not in the spec; hidden, for tuning |
| `OFFLINE_DURING_SERVICE` | `true` | Commands and receiving work offline and sync later |
| `COMMAND_RECORDER_ROLES` | `["chef", "waiter", "cashier"]` | Who can record commands |
| `STOCK_LOW_FACTOR` / `STOCK_VERY_LOW_FACTOR` | `1.0` / `0.5` | Spec: low = less than one service's average use; "very low" is our choice |
| `UNDO_SECONDS` | `5` | Undo snackbar after Accept, Served/Handed, Decline and Confirm |

## Where the spec is silent (approved choices)

- "Expected around" and "paid by" on Home are shown only when the data exists.
- Undo after Confirm & add to stock delays sending by `UNDO_SECONDS` instead of reversing on the server.
- Pay myself and Send to restaurant show as "Coming soon" until Food Bundles provides payments and restaurant accounts (see `docs/phase9-external-dependencies.md`).
