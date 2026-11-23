# On-device QA checklist (Phase 9: the Food Bundles UX spec)

Run on an iPhone and an Android phone, in **Light** theme, once in each language
(Profile → Settings → Language: EN, FR, RW). Compare each screen with its mockup page in
`mobile/.claude/docs/ux/Chef App — Screen UX (Food Bundles).pdf`. Tick a box only when it
works on the device.

**Setup (dev backend, one RW kitchen):**
- **Kitchen:** RWF, Africa/Kigali, opens 11:00 and closes 22:00 (Profile → Service hours).
- **Dishes:**
  - Boilo, 7,000, with the mockup recipe;
  - Chicken Legs, 5,000: 0.3 kg chicken.
- **Stock:** Chicken 0.6 kg.
- **Staff:** a waiter "Alice" and a waiter "Jean".

## Stage 1: navigation and Home (pages 1–3)
- [ ] **Bottom bar:** exactly Home · Receive · Commands · Stock · Requisition, evenly spaced. No floating AI button.
- [ ] **Home header:** small caps KITCHEN, kitchen name, fork-and-knife (opens Menu & recipes), profile icon (opens Profile), Switch (kitchens).
- [ ] **Before opening, with a Food Bundles order due today:** card 01 shows the status pill, the total, the item count, the order no., the first 3 items, "+ N more" and the Receive delivery button.
- [ ] **No order due today:** "No delivery expected" and "Add items bought elsewhere".
- [ ] **"No delivery today? Skip"** moves Home to 02 after opening.
- [ ] **02 after opening with the delivery received:** 4 counters, the newest command with its stock check, "Open commands (N new)".
- [ ] **03:**
  - After closing, or after Stock → End of day: "Today in short" (Served, Cancelled), tomorrow's requisition total, Review requisition.
  - The progress bar shows ✓ Received / ✓ Commands.
- [ ] **Profile:**
  - Service hours shows 11:00–22:00 and opens the kitchen form, where opening and closing are editable.
  - Closing before opening shows an error.
- [ ] **Assistant:** not visible (the flag is off).
- [ ] **Offline (airplane mode):** a dark pill above the tab bar says Offline and shows queued changes.

## Stage 2: Menu & recipe (page 9)
- [ ] **Menu:** the fork-and-knife opens Menu (with a back button). + opens the Dish recipe form.
- [ ] **Recipe:** name, price, category pills; Add ingredient searches the catalogue (FB price "4,500 / kg"); "Add … as a custom ingredient" works.
- [ ] **Boilo with the mockup quantities:** line costs 1,125 / 120 / 120 / 40 / 36 / 60. The cost card shows 1,501, 7,000, margin 5,499 · 78.6 %.
- [ ] **Keyboard:** Next moves to the next quantity. Save is in the header.
- [ ] **"On today's menu" off:** the dish disappears from New command.
- [ ] **"From a photo"** (only when dish analysis is on) adds suggested ingredients to check.

## Stage 3: Receive (page 4)
- [ ] **Today's FB order:** opens with the received fields EMPTY, "0 of N checked" and tags on "Check".
- [ ] **Typing 7.0 for 8 kg potatoes:** the line turns Issue with Short weight preselected.
  - Damaged, Not fresh and + Photo toggle.
- [ ] **Counter and confirm:**
  - "5 of 6 checked".
  - Confirm asks first ("1 item has no weight…"); after Confirm anyway, "Added to stock" shows with Undo for 5 s.
- [ ] **Undo:** removes the receipt (nothing in Stock "In"). Without Undo, Stock shows the received quantities in "In".
- [ ] **Bought elsewhere:**
  - "Add item bought elsewhere": the catalogue items show the FB price.
  - "Scan receipt" opens the document scan when it is on.
- [ ] **Offline:** confirm a receipt in airplane mode. The queue count shows. Back online, it syncs and Home moves to 02.

## Stage 4: Commands (pages 5–8)
- [ ] **New command (chef):**
  - Tiles show the price, "N ordered today" and "Can make N".
  - + stops at Can make; an out-of-stock dish is greyed "Out of stock".
- [ ] **Save:** "Save · 3 × Chicken Legs · 15,000" → "Command #050 saved" style screen with the day total ("15 ordered (was 12)") and "can make N more". The command is Cooking.
- [ ] **Recorded by Alice (waiter):** the command waits as New in "New · waiting for you".
- [ ] **Not enough stock:**
  - 3 × Chicken Legs with 0.6 kg chicken: red "Not enough stock — Chicken: need 0.9 kg · have 0.6 kg".
  - Accept is disabled; Decline is primary.
- [ ] **Decline sheet:**
  - Need 0.9 / Have 0.6 / Short 0.3.
  - The message "Declined – not enough Chicken (short 0.3 kg)."
  - The checkbox is on; "Accept 2 of 3" is offered.
- [ ] **Undo:** Accept, Served (dine-in) / Handed (to go) and Decline each show Undo for 5 s.
- [ ] **Filters and counters:** All · Dine-in · To go counts match. The counter line updates.
- [ ] **Offline:** record a command in airplane mode. It shows at once; back online it keeps the same id (never duplicated).

## Stage 5: Today's stock (page 10)
- [ ] **Table:** Item · Start · In · Used · Left. Left is amber (low) or red (very low) as stock runs down.
- [ ] **Count:**
  - Pick an item, enter a count. The difference appears with Waste / Spoilage / Error.
  - After saving, Left equals the count.
- [ ] **Used by:** tapping an item lists the dishes that used it today.
- [ ] **End of day · Make requisition:** opens Requisition, and Home shows 03.

## Stage 6: Requisition and share (pages 11–12)
- [ ] **Header:** "For <tomorrow> · suggested from today's stock and sales".
- [ ] **Lines:** each has a reason ("Left 1.9 · need 5.9 · 4,500/kg") and a − / + stepper in pack sizes. − below one pack removes the line.
- [ ] **Add item and footer:** Add item works. The footer shows "N items" and the total. Continue opens "Send requisition".
- [ ] **Coming soon:** Pay myself and Send to restaurant are greyed "Coming soon".
- [ ] **WhatsApp:**
  - The message preview matches page 12 (in EN, line for line).
  - Share on WhatsApp opens WhatsApp with the text.
  - Tomorrow's Receive is pre-filled with these items.

## Languages and accessibility (every stage)
- [ ] **Languages:** FR and RW show no English leftovers, and no text is cut off on buttons, chips or tabs.
- [ ] **Font size:** at 200 %, buttons stay usable and nothing overlaps.
- [ ] **Screen reader (VoiceOver / TalkBack):** reads every button and the stock check. The Home steps read as "Step 1 of 3…".
