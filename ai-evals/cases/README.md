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

## Images

- JPEG (`image.jpg`), prepared like the app does: long edge ≤ 1600 px (dishes ≤ 1024 px), under
  1 MiB, no GPS or other metadata.
- No faces, phone numbers, customer names or other personal data in the photo.
- Record who agreed to the photo being used in `consent`.

## `expected.json`

Common fields: `kind` (required), `language` (`en` / `fr` / `rw`, the language the app would
send; default `en`), `tags` (free labels such as `handwritten`, `blurry`, `angled`, `clear`), `consent`.

**Menu** (`kind: "menu"`): every item exactly as written (do not translate dish names), price as
whole RWF (`"2.5k"` → `2500`, no price → `null`), category `main` / `side` / `drink` / `dessert` or
`null` when it is not obvious.

```json
{"kind": "menu", "language": "fr", "tags": ["handwritten"], "consent": "Chef A, 2026-11-20",
 "items": [{"name": "Brochette de chèvre", "price": 2500, "category": "main"},
           {"name": "Fanta", "price": 1000, "category": "drink"}]}
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

**Delivery note / receipt** (`kind: "delivery_note"` or `"receipt"`): every line; `quantity` as a
number, `unit_price` and `line_total` in whole RWF or `null` when not printed.

```json
{"kind": "delivery_note", "tags": ["printed"], "consent": "…",
 "lines": [{"name": "Tomatoes", "quantity": 25, "unit": "kg", "unit_price": 1000, "line_total": 25000}]}
```

**Junk** (`kind`: `other`, `stock_shelf`, `dish`, … whatever the photo really is):

```json
{"kind": "other", "tags": ["blurry"], "consent": "…"}
```

## Assistant cases (`assistant/cases.jsonl`)

One JSON object per line: `id`, `language`, `turns` (the chef's messages; with several turns the
runner sends each one with the assistant's previous reply as history), `expect`, `source`,
`needs_native_review` (Kinyarwanda drafts).

`expect.type` is `proposal`, `clarification` or `answer`. Proposals give `action_type` and the
`params` that must match. Answers may give `mentions_any` (accepted spellings of a figure),
`no_data: true` (the kitchen has no such data: no number may be invented) or
`out_of_domain: true` (a polite refusal also passes).

Check that the files are valid with `python ai-evals/parity.py plan`.
