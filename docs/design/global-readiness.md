# Step 2a: global readiness (money, currencies, units, clarifying questions)

**Status:** approved with the decisions below on 2026-11-19; being built in the order of
section 3.

## Decisions (2026-11-19)

| # | Topic | Decision |
|---|---|---|
| 1 | Exchange-rate provider | **ExchangeRate-API (paid Pro plan) primary, Frankfurter fallback**, after the licence check below. Keys in server env only (`.env.example` empty; secret-scan rule added) |
| 2 | Stale rates | Usable up to **3 days** old (covers weekends, when central banks don't publish); the rate date is always shown. Older or missing → "rate unavailable" |
| 3 | Changing kitchen currency | Offer **"convert at a stated rate"** and **"relabel"**. Relabel needs a before/after price preview, a typed confirmation, and a strong warning when the kitchen has sales, orders or stock history. Who changed it and when is logged |
| 4 | Ingredient costs in another currency | Keep the original; convert for food cost and show the rate and its date |
| 5 | Menu with no currency | Ask once per scan, kitchen currency preselected |
| 6 | "k" amounts | Confirm once per scan |
| 7 | Price rounding steps | Per-currency defaults in config, editable per kitchen: RWF 100, UGX 500, KES 10, NGN 50, USD 0.50, EUR 0.50; other currencies use their minor unit |
| 8 | Time zones | Use the **kitchen's** time zone everywhere (Assistant "today", reports, daily totals, scheduled jobs, stock days); no hard-coded Kigali. Tests with a kitchen in another time zone across midnight. Done in build step 1 |
| 9 | Food Bundles catalogue | Shown (catalogue and requisition-from-catalogue) only for kitchens in countries Food Bundles serves: config list, default `["RW"]`; other kitchens use manual items |

### Exchange-rate licence check

See **[exchange-rate-licences.md](exchange-rate-licences.md)** (terms re-read 2026-11-19, with
links and verbatim quotes). In short: ExchangeRate-API Pro remains the proposed primary,
**after written confirmation** that showing the rate next to a conversion inside our app is
allowed ("your end purposes"; its terms forbid re-distribution). Frankfurter is the fallback
and, until a key is bought, the only source.

Our use (food cost, showing an imported menu's converted prices, cross-kitchen reports) is
informational, which matches every provider's disclaimer. Paying suppliers is out of scope.
**Scope change:** the app serves kitchens in any country. Every AI and pricing feature must
handle any currency, number format, unit and language, and ask the chef when something is
ambiguous. Rwanda becomes one supported case with no special handling. Step 2 (eval parity)
waits until this is built, so it measures the new behaviour, not the RWF-only one.

## 1. What assumes RWF or Rwanda today

### Backend

| Area | Where | Assumption |
|---|---|---|
| Kitchen currency | `modules/kitchens/models.py:27`, `schemas.py:16` | `currency` column exists (`String(3)`, default `"RWF"`), but nothing validates it as ISO 4217 and almost nothing reads it |
| Default currency | `core/constants.py:4` | `DEFAULT_CURRENCY = "RWF"` |
| Kitchen timezone | `kitchens/models.py:28`, `schemas.py:17` | default `"Africa/Kigali"` |
| Money columns | `menus/models.py:76` `selling_price`, `ingredients/models.py:43` `cost_per_unit`, `orders/models.py:77` `unit_price`, `catalog/models.py:32` `reference_price` | `Numeric(14,2)` / `Numeric(12,2)` decimals with **no currency on the row**; currency is implied to be the kitchen's (comments say "RWF") |
| Price parsing | `domain/calculations.py:236-270` `parse_rwf_price` | Whole RWF only: strips `RWF`/`Frw`/`Frs`/`/=`, rejects `"3.50"`, treats `"3.500"` as 3500, keeps `"20$"` as **20** |
| Price rounding | `calculations.py:272` `round_up_price` | Rounds to 100 (an RWF habit) |
| Document prices | `calculations.py:313` `unit_price_from_total` | Whole-RWF integers |
| Menu / document extraction | `modules/ai/gateway/service.py:133, 185-191` | Every extracted price goes through `parse_rwf_price` |
| Dish price suggestion | `gateway/service.py:297-322` | Range from ingredient costs, rounded to 100 |
| Response schemas | `schemas/gateway.py:89-139` | `MenuExtractItem.price: int`, `DocumentLine.unit_price/line_total: int` ("Whole RWF"); no currency, no document total |
| Assistant context | `agent_service.py:126, 156` | Kitchen context labels "cost per unit RWF", "price RWF" |
| Assistant "today" | `agent_service.py:55, 151, 237` | `KIGALI` timezone hard-coded (not the kitchen's) |
| Assistant prompt | `prompts/agent/v2/meta.md:22` | `"selling_price": "<whole RWF>"` |
| Menu prompt | `prompts/menu_extract/v1/meta.md:8` | Examples are all RWF (`Frw 2500`, `2.5k`, `3 000 RWF`) |
| Document prompt | `prompts/document_extract/v1/meta.md` | No currency, no document total, no arithmetic check |
| Sales summary | `sales/schemas.py:46`, `sales/router.py:51` | `currency: str = "RWF"` literal |
| Units | `calculations.py:190-200` `_UNIT_FACTORS` | Metric only (kg, g, mg, l, ml); no imperial, no pack units (bag, carton, crate, dozen) |
| Catalog | `catalog/models.py:31` | Food Bundles reference prices in RWF (a Rwandan supplier) |
| Scheduler | `workers/scheduler.py:12, 49` | Low-stock reminders at 05:00 UTC "07:00 Kigali" for every kitchen |
| SMS / OTP | `integrations/sms/pindo_provider.py:23-36` | Rwandan phone normalisation, Rwanda-based gateway |
| Speech-to-text | `schemas/transcription.py:9` | Default language `rw` |
| AI cost | `ai_spend_daily.cost_usd` | USD: **correct as is**, stays USD |

### Mobile

| Area | Where | Assumption |
|---|---|---|
| Money formatting | `src/lib/format.ts` `formatRWF` | `"3,500 RWF"`, integer only, `en-RW` / `fr-RW` number locales. **36 calls in 11 files** |
| Price anomaly | `src/domain/anomaly.ts` `detectAnomaly(value, peers)` | Plain numbers, no currency: would compare USD with RWF |
| Scan review | `src/features/menu/scan-review.ts` `wholeRwf` | Whole RWF parsing, duplicate-price check in RWF |
| Local cache | `src/data/sqlite/database.ts:36, 47, 86` | Columns `price_rwf`, `unit_price_rwf` (REAL). Deliveries already store `amount` + `currency` (lines 108-112): a good precedent |
| Types | `src/api/sales-api.ts:38` | `currency: 'RWF'` literal type |
| Kitchen setup | `src/features/kitchens/KitchenFormFields.tsx` | **No currency field** (the API accepts one) |
| Price inputs | 5 screens use `keyboardType="number-pad"` for prices | No decimal key: cannot type 7.99 |
| Strings and PDF | 6 English i18n keys mention RWF; `src/lib/pdf-requisition.ts` | RWF hard-coded in text |
| Mocks | `src/data/mock/*` | RWF sample data (fine for tests, keep explicit) |

### Evals

The graders compare integer prices; the 20 draft answer keys use the retired `non_rwf`
marker. Both change in section 2f.

## 2. Proposal

### a. Money model

**Rule:** every amount travels with its currency. Prices are stored as integer **minor units +
ISO 4217 code**, using each currency's decimal places.

- **Currency table.** One vendored ISO 4217 table (`code`, `minor_units`, `name`) from the
  ISO 4217 maintenance agency's published list, used by both backend and mobile (the mobile
  copy is generated from the backend file; a test checks they match). Examples: RWF 0,
  UGX 0, JPY 0, KES 2, NGN 2, USD 2, EUR 2, KWD 3.
- **Kitchen currency.** Required at kitchen setup. The picker defaults to the device region's
  currency and the chef confirms it. Editable later, with a warning. Changing it never
  silently changes amounts; the chef chooses one of:
  1. **"My prices were entered in the wrong currency"**: relabel only, amounts unchanged.
  2. **"Convert my prices"**: convert every price at one stated rate and date (section 2b),
     shown before confirming.
  Both write an audit event.
- **What is stored how.**

  | Value | Storage | Why |
  |---|---|---|
  | Menu selling price, order line unit price, catalog reference price, invoice lines and totals, actual paid price | `*_minor BIGINT` + `*_currency CHAR(3)` | Amounts people pay are exact in minor units |
  | Ingredient cost per unit (e.g. per gram) and computed food cost | `NUMERIC(18,6)` + currency | A unit cost is often a fraction of the smallest coin (0.35 RWF per g); rounding it to minor units would distort recipe costs |

  Rounding to minor units happens only at the boundary (display, totals, invoices), with
  ROUND_HALF_UP. **Conversions** (review item A3, 2026-11-19) round **ROUND_HALF_EVEN** to
  the target currency's minor unit (6 places for unit costs), **once, at the end**, on
  amount × USD→target ÷ USD→source; no intermediate amount or rate is rounded first.
  Suggested selling prices then round UP to the price step (decision 7).
- **API contract.** Money is a JSON object with a decimal **string**, never a float:
  `{"amount": "7.99", "currency": "USD"}` (`"amount": "3500"` for RWF). For one release the
  old fields (`selling_price: "3500.00"`) stay alongside the new ones, so installed app
  versions and queued offline mutations keep working. The sync endpoint accepts both forms;
  a bare number is read in the kitchen's currency, which is exactly today's meaning.
- **Display.** Mobile formats with `Intl.NumberFormat(locale, {style: "currency", currency})`
  using the currency table's decimal places. Kinyarwanda falls back to `en` number formatting
  (as today). `formatRWF` is replaced by `formatMoney(money, lang)` at all 36 call sites.
  Hermes' `Intl` currency support must be verified on a device build. If it is incomplete,
  a small fallback formatter uses the table (symbol or code, grouping, decimals). Price
  inputs use `decimal-pad` when the currency has decimals.
- **Migration** (Alembic, reversible, verified on the dev database first, never production
  without approval):
  1. Add the new columns (nullable). Backfill `currency` from the kitchen (every existing
     kitchen is RWF) and `*_minor = amount × 10^minor_units`. A pre-check lists any RWF
     amount with a non-zero fraction (RWF has 0 decimals) so nothing is rounded silently;
     the migration stops if any exist, for a decision.
  2. Dual-write old and new columns for one release; reads switch to the new columns.
  3. Make the new columns NOT NULL and drop the old ones in a later migration.
  4. Kitchens get a validated ISO code (`CHECK` + application validation). The `RWF`
     default is kept only for rows that already exist; new kitchens must choose.
  5. Mobile SQLite: a new local migration adds `*_minor` + `*_currency` and backfills from
     `price_rwf` with currency RWF. Old columns are dropped later, never reset destructively.

### b. Currency conversion

**Rule:** exchange rates come **only** from an exchange-rate service, stored per day with
source and timestamp. The AI models never produce, estimate or see exchange rates.

**Providers** (checked on the providers' own pages, 2026-11-19; licences still to be read in
full before signing):

| Provider | Cost | Update frequency | Coverage | Licence / terms |
|---|---|---|---|---|
| [Open Exchange Rates](https://openexchangerates.org/signup) | Free: 1,000 requests/month, hourly, USD base only. Developer **$12/month**: 10,000 requests, hourly, any base. Enterprise $47/month: 30-minute, time series | Hourly (paid: down to 5 min) | 200+ currencies incl. RWF, KES, UGX, NGN | Commercial plans; services agreement linked from the site, **to review** |
| [ExchangeRate-API](https://www.exchangerate-api.com/) | Free: 1,500 requests/month, daily. Pro **$10/month** ($100/year): 30,000 requests, hourly, history included. Business $30/month: 5-minute | Daily (free), hourly (Pro) | About 161-165 currencies (the page states both) | Terms of service linked from the site, **to review** |
| [Frankfurter](https://frankfurter.dev/) | Free, no key, open source ([MIT code](https://frankfurter.dev/license/)), can be self-hosted | Daily (central-bank reference rates) | [200 entries](https://api.frankfurter.dev/v2/currencies); sources include the National Bank of Rwanda (RWF, KES, UGX), the Central Bank of Kenya and the Central Bank of Nigeria (NGN) | Data "public data, shared for information", **no warranty**; each central bank's terms apply |

**Recommendation:** one commercial provider as the primary (Open Exchange Rates Developer,
$12/month, or ExchangeRate-API Pro, $10/month). Kitchens need one rate table per day, about
30-60 requests a month, so either fits easily. Frankfurter is the **fallback**: it serves
official central-bank reference rates, which may be what an accountant expects in some
countries. Every stored rate records which source it came from.

**Storage and behaviour:**

- Table `exchange_rates(rate_date, base, quote, rate NUMERIC(24,12), source, provider_timestamp,
  fetched_at)`, unique on `(rate_date, base, quote, source)`. Cross rates (RWF→EUR via USD)
  are computed from one source (never mixing sources) and labelled as cross rates. *Built
  (step 3):* central banks publish on different days (on 2026-11-19 Frankfurter had ECB's EUR
  for the 19th but BNR's RWF only for the 18th), so each leg uses its newest day within the
  window and the cross rate is dated by its **older** leg; that is the date shown.
- A daily job fetches the table (arq scheduler) and keeps it in a short cache. Nothing else
  writes to this table.
- Staleness: a rate up to 3 days old (decision 2) is used with its date shown ("rate of 17 Nov").
  Anything older, or missing, is **"rate unavailable"**: conversion is disabled and the
  original amount is kept. No interpolation and no guessing. Thresholds are configurable.
- `convert(money, to_currency, on_date) → Converted(original, converted, rate, rate_date,
  source)` is the **only** way to convert. It reads only the rates table and raises
  `RateUnavailable` otherwise.
- **Tests the AI never supplies a rate:**
  1. conversion with an empty rates table raises `RateUnavailable`;
  2. extraction schemas have no rate field and reject unknown fields, so a model-produced
     "rate" is dropped;
  3. an architecture test fails if anything but the rates job writes to `exchange_rates`;
  4. a test feeds a menu whose image text says "1 USD = 1,000 RWF" and checks that the
     stored rate is unchanged and the conversion uses the table.

**Where conversion appears** (always showing original amount, converted amount, rate and rate
date; the original currency is kept unless the chef chooses to convert):

| Place | Default | Conversion |
|---|---|---|
| Importing a menu printed in another currency | Ask (section 2d) | Only if the chef taps "Convert at 1 USD = X RWF (date)" |
| Supplier or catalogue prices in another currency | Keep the original amount and currency on the line | Converted value shown next to it for food-cost purposes, with rate and date |
| Food cost (recipe cost) | Kitchen currency | Ingredient costs in another currency use that day's rate; without a rate the cost shows "rate unavailable" rather than a wrong number |
| Cross-kitchen reports (kitchens in different currencies) | Each kitchen in its own currency | Optional reporting currency chosen by the chef, at the report date's rate, rate shown |
| Sales | Never converted. Each sale keeps the price and currency it was recorded at; daily totals are one subtotal per currency (never added across currencies, e.g. after a currency change), and the Assistant gets the same subtotals | |

### c. Extraction changes (menu, dish price suggestions, documents)

**Model output per price** (same schema for both providers):

```json
{"text": "7,99 €", "amount": "7.99", "currency": "EUR",
 "currency_evidence": "symbol", "evidence_text": "€", "confidence": 0.95}
```

`text` is exactly as printed; `amount` is a decimal string or null; `currency` is ISO 4217 or
null; `currency_evidence` is `symbol` / `code` / `word` / `context` / `none`.

**The server re-checks the model.** A deterministic parser reads `text` with the rules below;
if it disagrees with the model's `amount`, or the case is ambiguous, the price is flagged for
a clarifying question rather than picked silently.

| Printed | Result | Rule |
|---|---|---|
| `12,000 Rwf` | 12000 RWF | Comma + 3 digits = thousands; `Rwf` is RWF |
| `Frw 1,500` | 1500 RWF | `Frw` is RWF |
| `2.5k` | 2500, currency from context | `k` = × 1000; **confirmed once per scan** ("2.5k = 2,500?") |
| `$7.99` | 7.99, currency **USD candidate** | `$` is shared by USD, CAD, AUD and others: if the kitchen uses a dollar currency, use it; otherwise ask |
| `7,99 €` | 7.99 EUR | Comma + 2 digits in a 2-decimal currency = decimal comma |
| `1.500` | **ambiguous** (1500 or 1.5) | Decide from other prices in the same document (e.g. `12,000` shows the grouping style) or the currency's decimals; otherwise ask |
| `₦71,200` | 71200 NGN | `₦` is NGN |
| `20` (no symbol) | 20, currency **missing** | One question per scan: "Prices have no currency. Are they in RWF?" with your kitchen currency first |
| Amount in words ("Seventy one thousand two hundred") | 71200 | Words parsed (EN, FR); used to cross-check the figures; words alone are low confidence and confirmed |

**Documents** gain `document_total`, `subtotal`, `tax` and `currency`. Per line: quantity,
unit, unit price, line total. The server checks the arithmetic (`qty × unit price = line total`
within half a minor unit; `Σ lines (+ tax − discount) = total`) and **flags mismatches**.
It never corrects them; the chef decides.

**Units.** A unit registry replaces the metric-only table:

| Unit type | Units | Converted to the kitchen's unit? |
|---|---|---|
| Metric | kg, g, mg, l, cl, ml | Yes |
| Imperial | lb, oz | Yes: exact factors (1 lb = 0.45359237 kg) |
| US/UK ambiguous | gallon, quart, pint, fl oz | Ask "US or UK gallon?", unless the document says which |
| Countable | piece, each, dozen (= 12) | Yes |
| Pack units | bag, carton, crate, tray, box, sack, bunch | Only when the size is printed ("50 kg bag", "carton of 24") or the ingredient has a pack size set; otherwise ask |

**Languages.** Menus and documents in any language and script. Item names stay as printed;
replies follow the app language (EN/FR/RW).

**Prompts.** New versions: `menu_extract/v2`, `document_extract/v2`, `dish_analyze/v2` (price
suggestion in the kitchen currency, "nice" steps per currency from the table) and `agent/v3`
(money as `{amount, currency}`, units, clarifying questions). They get new version numbers so
Step 2 compares them cleanly.

### d. Clarifying-question policy (shared by Scan Menu, documents and the Assistant)

One shared module decides when to ask; the **server** decides, not the model, so both
providers behave the same. It asks **one** short question at a time, with tappable options,
in the app language (strings from i18n, not generated). With several issues it asks the one
with the biggest effect first. It does not ask in any other case.

| Kind | Example question | Options |
|---|---|---|
| `currency_mismatch` | "This menu is in USD. Your kitchen uses RWF." | Import in USD · Convert at 1 USD = X RWF (19 Nov) · Change kitchen currency (the convert option shows "rate unavailable" and is disabled when there is no rate) |
| `currency_missing` | "Prices have no currency. Which is it?" | RWF (kitchen) · Other… |
| `ambiguous_separator` | "Is 1.500 one thousand five hundred or one and a half?" | 1,500 · 1.5 |
| `k_suffix` | "2.5k means 2,500?" | Yes · No |
| `ambiguous_unit` | "Is this a US or UK gallon?" / "How many kg in one bag?" | US · UK / number field |
| `arithmetic_mismatch` | "Line 3: 6 × 2,150 = 12,900, but the total says 8,600." | Keep as printed · Edit |
| `unreadable_value` | "I couldn't read the price of Tilapia." | Type it · Skip |

Each question logs `ai_clarification {feature, kind, request_id}` (no content), with a saved
query for how often each kind appears per feature.

### e. Price anomaly and cost model

- The median check takes money, not numbers: `detectAnomaly(money, peers)` compares only
  peers in the **same currency** and needs at least 3 of them; otherwise no check. Same rule
  on the server's menu import.
- Food cost stays in the kitchen currency (conversion as in section 2b).
- AI cost tracking (`ai_spend_daily`) stays in USD.

### f. Evals

- **`expected.json` v2.** Every price is `{"text", "amount", "currency"}`. Cases and items get
  `should_clarify: ["currency_missing", ...]` when the right behaviour is to ask. The retired
  `non_rwf` marker is removed.
- **Graders.**
  - A price is right only when **amount and currency** both match: reading `20$` as 20 RWF
    is wrong.
  - Clarifications are scored as recall (it asked when expected) and false-alarm rate (it
    asked when nothing was ambiguous), per kind.
  - Where `should_clarify` is set, guessing a number scores as a miss.
  - Documents add document-total and arithmetic-flag scores.
  - `unreadable` stays excluded.
- **New Assistant cases** in EN/FR/RW (about 18 more):
  - a price in another currency ("Add Chapati for 5 dollars" in an RWF kitchen) →
    `currency_mismatch`;
  - "1.500" → `ambiguous_separator`;
  - "2 bags of rice" → `ambiguous_unit`;
  - "3 lb of beef" → no question, 1.36 kg;
  - "1 gallon of oil" → `ambiguous_unit`;
  - "2.5k" → `k_suffix`.
- **Kitchens.** The eval kitchen fixture gets a currency, plus a second fixture kitchen in EUR.
- **Re-draft** the 20 photos in v2 format (still `draft`) after the build, then you verify.
- **Coverage report** against the new targets each time photos are added (section 4).

## 3. Build order (after approval)

Each step has its own tests and commit, with the suite green before each.

1. Currency table + money type (backend and mobile) + `formatMoney` + kitchen currency
   validation and picker.
2. Database migration with dual-write; API money objects with backward-compatible fields;
   mobile SQLite migration.
3. Exchange rates: provider client, daily job, table, `convert()`, staleness rules and the
   "AI never supplies a rate" tests.
4. Parser + unit registry + arithmetic checks (deterministic, heavily unit-tested with the
   formats above).
5. Extraction schemas v2 and prompts v2 for both providers; clarification module; mobile
   question UI (one shared component) with EN/FR/RW strings.
6. Anomaly per currency; replace `formatRWF` (36 calls); `decimal-pad` inputs; RWF strings
   and PDF.
7. Evals: v2 format, graders, PARITY.md, new Assistant cases, re-drafted photo answers.

Then you verify the answers and Step 2 runs.

## 4. Photo coverage against the new targets (2026-11-19)

| Target | Have | Gap |
|---|---|---|
| 30 menus across ≥ 5 currencies (RWF, USD, EUR, KES/UGX, NGN), incl. handwritten, French, Kinyarwanda | 5 menus: RWF 1, USD 1, "$" 1, unknown 2 (the chalkboard and the trifold, prices unreadable); handwritten 1 (chalkboard, unusable); French title only 1; Kinyarwanda 0 | 25 menus; EUR, KES/UGX, NGN menus; handwritten, French and Kinyarwanda menus |
| 30 dishes from several cuisines | 10 (East/West African, fast food, South Asian, flatbread) | 20 |
| 20 delivery notes/receipts incl. handwritten and imperial units | 4: NGN handwritten 1, USD 1, unreadable 1, non-food template 1; imperial 0 | 16; imperial-unit documents; EUR/KES/UGX/RWF documents |
| 10 junk | 1 | 9 |

## 5. Other Rwanda-only assumptions (not money, flagged for later)

- The Assistant uses Kigali time for "today": switch to the kitchen's timezone (small;
  include in build step 1).
- Low-stock reminders run at one UTC time for everyone: schedule per kitchen timezone.
- OTP SMS goes through a Rwandan gateway with Rwandan phone normalisation: needs an
  international SMS provider and E.164 handling.
- The Food Bundles catalog and ordering exist only where Food Bundles operates: hide or
  disable them for kitchens elsewhere.
- Speech-to-text defaults to Kinyarwanda: default to the app language.

## 6. Decisions I need from you

1. **Exchange-rate provider:** Open Exchange Rates ($12/month) or ExchangeRate-API ($10/month)
   as primary, Frankfurter as fallback? (I'll read the chosen provider's licence before
   building.)
2. **Stale-rate thresholds:** use with a date up to 2 days old, "rate unavailable" after
   that?
3. **Changing kitchen currency:** offer both "relabel" and "convert at one rate", as
   proposed?
4. **Ingredient costs in another currency:** keep the original and convert for food cost at
   the day's rate (proposed), or require ingredient costs in the kitchen currency?
5. **Missing currency on a whole menu:** ask once per scan (proposed) or per item?
6. **"k" amounts:** confirm once per scan (proposed) or only when other prices on the page
   don't make it obvious?
7. **"Nice" price steps** for dish price suggestions per currency (e.g. RWF 100, UGX 500,
   KES 10, NGN 50, USD/EUR 0.50): approve the idea; I'll put a table in config.
8. **Section 5:** fold the timezone fix into build step 1, and list the others as open
   items?
