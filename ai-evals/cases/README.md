# Phase 8 parity cases

One folder per image case, plus one file of Assistant text cases:

```text
cases/
  menu/<id>/image.jpg + expected.json        printed, handwritten, FR/RW menus
  dish/<id>/image.jpg + expected.json        single dishes
  document/<id>/image.jpg + expected.json    delivery notes and receipts
  junk/<id>/image.jpg + expected.json        anything else: blurry, stock shelf, random photos
  assistant/cases.jsonl                      Assistant text cases (EN/FR/RW)
```

Every image case is also a **classification** case: its `expected.json` `kind` is the label the
classifier must return. `<id>` is free text without spaces, e.g. `menu/handwritten-fr-03`.

## From raw photos to verified answers

Real photos and their answer keys never go into git (`ai-evals/.gitignore` ignores
`inbox/`, the real case folders and the review files).

1. Put the raw photos in `ai-evals/inbox/`.
2. A person writes `inbox/drafts.json` (feature, case id and a draft answer per photo),
   transcribing what is visible. Never draft answers with the app's AI endpoints: the test
   would grade itself.
3. `python ai-evals/prepare_cases.py ai-evals/inbox/drafts.json` re-encodes each photo from
   its pixels only (EXIF, GPS, ICC profiles and comments removed) and writes
   `cases/<feature>/<id>/image.jpg` + `expected.json` with `"status": "draft"`.
4. `python ai-evals/review_sheet.py` builds `review.html` (each image beside its answer, with
   values needing a decision highlighted) and `review.csv`.
5. Correct `review.csv` in a spreadsheet, then `python ai-evals/apply_review.py` (dry run)
   and `python ai-evals/apply_review.py --write`: every case in the CSV becomes
   `"status": "verified"`, or `"excluded"` when its `exclude` cell says `yes`.

Evals use **verified** cases only (`parity.py run`); `plan --include-drafts` lists and
prices drafts.

## Special values

- `"unreadable"`: the value (or a whole item / line name) cannot be read in the photo. It is
  left out of scoring instead of counting as wrong.
- Prices in any currency are scored, as **format 2** (Step 2a, `"format": 2`). Each price is
  `{"text": "7,99 €", "amount": "7.99", "currency": "EUR"}`:
  - `text`: exactly as printed;
  - `amount`: a decimal string, or `null` when the right behaviour is to ask (for example
    "1.500" with nothing on the page to decide);
  - `currency`: ISO 4217, or `null` when no currency is printed or it is ambiguous ("$").
  - The whole price is `null` when none is printed. The retired `non_rwf` marker is rejected.
- `should_clarify`: the clarifying questions the app should ask (case or item level). Kinds:
  `currency_mismatch`, `currency_missing`, `ambiguous_separator`, `k_suffix`,
  `ambiguous_unit`, `arithmetic_mismatch`, `unreadable_value`. Asking when the list doesn't
  expect it counts as a false alarm; guessing where it does counts as a miss.
- `kitchen`: `rwf` (default, `fixtures/eval-kitchen.json`) or `eur`
  (`fixtures/eval-kitchen-eur.json`).

## Images

- JPEG (`image.jpg`), prepared like the app does: long edge ≤ 1600 px (dishes ≤ 1024 px), under
  1 MiB, no GPS or other metadata.
- No faces, phone numbers, customer names or other personal data in the photo.
- Record who agreed to the photo being used in `consent`.

## `expected.json`

Common fields: `kind` (required), `status` (`draft`, `verified` or `excluded`; missing = draft), `language` (`en` / `fr` / `rw`, the language the app would
send; default `en`), `tags` (free labels such as `handwritten`, `blurry`, `angled`, `clear`), `consent`.

**Menu** (`kind: "menu"`): every item exactly as written (do not translate dish names), the price
in format 2 (no price → `null`), category `main` / `side` / `drink` / `dessert` or `null` when it
is not obvious.

```json
{"kind": "menu", "format": 2, "language": "fr", "tags": ["handwritten"], "consent": "Chef A, 2026-11-20",
 "should_clarify": ["k_suffix"],
 "items": [{"name": "Brochette de chèvre", "price": {"text": "2.5k Frw", "amount": "2500", "currency": "RWF"}, "category": "main"},
           {"name": "Fanta", "price": {"text": "Frw 1,000", "amount": "1000", "currency": "RWF"}, "category": "drink"}]}
```

Names are matched with a normalised fuzzy score of at least 0.9 (see PARITY.md). Write the name the
way it appears; `"Chips"` and `"Chips (frites)"` are different names for the grader.

**Dish** (`kind: "dish"`): the ingredients a chef would expect, using the eval kitchen's names
where the ingredient exists there (`fixtures/eval-kitchen.json`: Potato, Cooking oil, Rice, Beans,
Beef, Tomato, Onion). Add ingredients to the fixture when your dishes need them.

```json
{"kind": "dish", "tags": ["clear"], "consent": "…",
 "dish_name": "Chips", "category": "side", "ingredients": ["Potato", "Cooking oil", "Salt"]}
```

**Delivery note / receipt** (`kind: "delivery_note"` or `"receipt"`):
- every product line: `quantity` as a number, exactly as printed (not converted); `unit` as
  printed; `unit_price` and `line_total` in format 2, or `null` when not printed. Subtotal,
  tax, fees, total, cash and change are not lines.
- `total`: the printed total, in format 2.
- `arithmetic_flags`: the issues the check must raise (`line_arithmetic`,
  `subtotal_mismatch`, `total_mismatch`, `words_mismatch`). Use `[]` when the document adds
  up. Never correct the numbers in the key.

```json
{"kind": "delivery_note", "format": 2, "tags": ["printed"], "consent": "…",
 "should_clarify": [], "arithmetic_flags": [],
 "total": {"text": "Frw 25,000", "amount": "25000", "currency": "RWF"},
 "lines": [{"name": "Tomatoes", "quantity": 25, "unit": "kg",
            "unit_price": {"text": "1,000", "amount": "1000", "currency": null},
            "line_total": {"text": "25,000", "amount": "25000", "currency": null}}]}
```

**Junk** (`kind`: `other`, `stock_shelf`, `dish`, … whatever the photo really is):

```json
{"kind": "other", "tags": ["blurry"], "consent": "…"}
```

## Assistant cases (`assistant/cases.jsonl`)

One JSON object per line: `id`, `language`, `turns` (the chef's messages; with several turns the
runner sends each one with the assistant's previous reply as history), `expect`, `source`,
`needs_native_review` (Kinyarwanda drafts).

`kitchen` (optional): `rwf` (default) or `eur`. `expect.type` is `proposal`, `clarification` or `answer`;
`expect.clarify_kind` names the kind of the question the server must ask (agent/v3). Proposals give `action_type` and the
`params` that must match. Answers may give `mentions_any` (accepted spellings of a figure),
`no_data: true` (the kitchen has no such data: no number may be invented) or
`out_of_domain: true` (a polite refusal also passes).

Check that the files are valid with `python ai-evals/parity.py plan`.
