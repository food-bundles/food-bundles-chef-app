# Exchange-rate providers: licence comparison

Terms pages re-read on **2026-11-19** (quotes are verbatim). This replaces the first table in
`global-readiness.md`, which overstated two points; the corrections are listed at the end.

**Our use:** the app shows a converted amount next to the original, with the rate and its
date (food cost, imported menus, currency change), to the kitchen's own staff inside the app.
We never sell rates, never offer an API or feed of rates, and never use them to pay anyone.

| | [ExchangeRate-API](https://www.exchangerate-api.com/terms) | [Open Exchange Rates](https://openexchangerates.org/terms) | [Frankfurter](https://frankfurter.dev/license/) |
|---|---|---|---|
| **Commercial use** | **Yes.** "both Free Plan and paid ExchangeRate-API accounts are suitable for either commercial or personal use." | **Yes on paid plans.** Purchases fall under the [Services Agreement](https://openexchangerates.org/services-agreement/): "You are only able to enter into the Contract if you are a business customer." (The site terms' "not … for any commercial or business purposes" applies to consumers using the website.) | **Not addressed.** "They're public data, shared for information." "If a provider publishes terms of use, they apply." The MIT licence covers the software, not the data. |
| **Showing rates to end users** | **Unclear: ask before buying.** "ExchangeRate-API data may only be used for your end purposes", "not in any product or service that offers programmatic or automatic access to exchange rate data", and "this license does not permit re-distribution of our data." We think a rate shown next to a conversion is our end purpose and not redistribution, but the terms don't say so. | **Not confirmed.** The Services Agreement licenses the data "on a non-exclusive, worldwide basis", scoped by an Acceptable Use Policy that is not on that page; not reviewed. | **Allowed as public information**, subject to each central bank's own terms (BNR, CBK, CBN, ECB, …), which we have not reviewed. |
| **Attribution** | None on the terms page (we use a keyed plan). | None stated. | None stated. |
| **Storing / caching** | "Users are given permission to store & re-use any data retrieved from our API." "caching is for customer end-use only." | Not stated on the pages read. | No restriction stated; self-hosting is supported. |
| **RWF, NGN, KES, UGX, EUR, USD** | All six listed on [supported currencies](https://www.exchangerate-api.com/docs/supported-currencies); none in its "notes for some currencies" (volatile-currency) list. | All six listed on [supported currencies](https://docs.openexchangerates.org/docs/supported-currencies). | All six; seen live on 2026-11-19: EUR (ECB) dated the 19th, RWF / KES / UGX / NGN dated the 18th. |
| **Update frequency and price** ([ExchangeRate-API pricing](https://www.exchangerate-api.com/#pricing), [OER plans](https://openexchangerates.org/signup)) | Free: daily, 1.5K requests/month. **Pro $10/month: every 60 minutes, 30K requests.** Business $30/month: every 5 minutes. | Free: hourly, 1K/month. **Developer $12/month: hourly, 10K.** Enterprise $47: 30 minutes. Unlimited $97: 5 minutes. | Daily central-bank reference rates; no weekend rates. Free. |
| **Warranty** | "We make no warranties or guarantees", and "Use of the exchange rates we provide for actual transactions or as financial data is explicitly not recommended." | "we make no representations, warranties or guarantees, whether express or implied" | "Rates and the API come as is, with no warranty." |

Our job calls each provider at most twice a day (about 60 requests a month), so every plan's
quota is far more than we need.

## Recommendation

1. **ExchangeRate-API Pro ($10/month) stays the proposed primary**: commercial use is
   explicit, it has the best documentation of the three, and coverage is clean. **Before
   buying, ask them in writing** (support@exchangerate-api.com): *"Our app shows the rate
   and its date next to amounts converted for our own customers inside our app. We don't
   offer rates through an API or feed. Is that within 'your end purposes' on the Pro plan?"*
   Buy only on a yes.
2. If the answer is no or unclear: **Open Exchange Rates Developer ($12/month)**, after
   reading its Acceptable Use Policy for the same question.
3. **Frankfurter stays the fallback** (free, daily, central-bank rates). Its data comes with
   no licence of its own, so treat it as public reference data under each central bank's
   terms. It is suitable for a fallback that shows its date, not as the only source long term.

## Written confirmation status

Conversion for kitchens outside `CURRENCY_CONVERSION_ENABLED_COUNTRIES` (default `["RW"]`;
every kitchen in development) stays off until one provider below confirms in writing. Prices
in a kitchen's own currency work in every country regardless. Fill in the date when the
question is sent, and the answer when it arrives; only then widen the flag.

| Provider | Question | Asked on | Answer |
|---|---|---|---|
| ExchangeRate-API | Showing the rate and date next to our own customers' converted amounts, Pro plan | _not yet sent_ | pending |
| Open Exchange Rates | Same question, plus the Acceptable Use Policy | _not yet sent_ | pending |
| Frankfurter | Commercial display of the central-bank data it serves (and whose terms apply: BNR, CBK, CBN, ECB) | _not yet sent_ | pending |

**Until a primary key is bought, Frankfurter is the only source** (recorded in
`docs/ai-providers.md`, open items). Rates are then daily, and there are none at weekends; the
3-day window covers a weekend.

## Corrections to the first table (2026-11-19, earlier version)

- Frankfurter: the first table said blended rates are "Frankfurter's own calculation and free
  to use". The page says "Frankfurter's own calculation, not an official rate", and does not
  address commercial use.
- ExchangeRate-API: the first table omitted "this license does not permit re-distribution of
  our data", which makes showing rates to end users a question to confirm rather than a pass.
- Open Exchange Rates: the first table said paid terms were "not public". The Services
  Agreement is public and is for business customers; only its Acceptable Use Policy is unread.
