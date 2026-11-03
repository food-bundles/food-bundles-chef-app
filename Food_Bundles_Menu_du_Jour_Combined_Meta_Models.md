# Food Bundles — Menu du Jour
## Combined Product Specifications and Developer Briefs

This Markdown file combines the two supplied PDF documents into one VS Code-friendly document. Product scope, business rules, formulas, API paths, data models, acceptance criteria and timelines are retained from the source documents. The AI-model recommendations and related AI-stack references have been updated to the requested Meta model family.

**Recommended Meta model resources**
- [Muse Spark series](https://dev.meta.ai/models/muse-spark)
- [Muse Wonder](https://dev.meta.ai/models/muse-wonder)
- [Muse Image](https://dev.meta.ai/models/muse-image)
- [Muse Voice Transcribe](https://dev.meta.ai/models/muse-voice-transcribe)
- [SAM 3.1](https://dev.meta.ai/models/sam-3-1)
- [Meta Model API](https://dev.meta.ai/products/meta-model-api)
- [Muse Glimmer](https://dev.meta.ai/models/muse-glimmer) — open weights
- [Muse Spark Open](https://dev.meta.ai/models/muse-spark-open) — open weights
- [Muse Code](https://dev.meta.ai/lp/muse-code) — coding agent

> Implementation note: verify model availability, exact API identifiers, capabilities, pricing, rate limits, licensing and hosting requirements before implementation. Model recommendations do not change the product rule that calculations and forecasts must be data-driven and deterministic.

---

# Document 1 — Menu du Jour Product Spec and Developer Brief
*Source PDF dated 26 October 2026*

FOOD BUNDLES

Menu du Jour Product Spec and Developer Brief — 10-day MVP 26 October 2026 · Prepared by Dioscore Shikama, CEO, Food Bundles Ltd

Menu du Jour is a Food Bundles-branded app for restaurants. A restaurant signs up, adds its menu by photo or typing, and enters weekly sales. The app returns a weekly purchase list, its cost at Food Bundles prices (with an option to compare other markets), and a menu du jour suggestion. Food Bundles uses the aggregated demand to plan sourcing from farmers and aggregators. This document is both the product spec and the developer brief.

1. Product summary One sentence: turn a menu and a weekly sales report into what to buy, what it costs, and what to push. • Users: restaurants (Android app) and Food Bundles staff (internal web dashboard). Farmers and aggregators do not use it. • Branding: Food Bundles. App name “Food Bundles” with Menu du Jour as the product inside it; Food Bundles logo, brand green and Calibri. • Open to any restaurant: customers and non-customers of Food Bundles can use it. • Prices: Food Bundles prices are the default; restaurants can compare with a public market or their own supplier. • Languages and currency: Kinyarwanda, English, French; RWF. Market: Kigali first.

2. Goals and success metrics The MVP must prove that restaurants enter their menu and weekly sales and use the purchase list they get back.

Metric                                                                   Day 10 (pilot)       Day 90

Restaurants signed up with a menu                                        10                   150

Active restaurants submitting weekly sales                               70%                  80%

Weekly active restaurants                                                7                    80

Time from sign-up to first purchase list                                 under 10 min         under 5 min

Purchase lists sent to Food Bundles (share of actives)                   baseline set         40%

Purchase list vs what was actually bought                                baseline set         within ±20%

Demand forecast vs actual (FB customers)                                 baseline set         within ±25% Targets are proposals for the team to adjust.

3. User flow The restaurant gives two inputs; the app returns three outputs. Nothing else is asked. 1. Sign up: phone + OTP, restaurant name, location, language. 2. Add menu: photo or typed list. AI extracts dishes and prices and builds a standard recipe per dish automatically.

3. Enter weekly sales: portions sold per dish, or a photo of the sales report. Monday reminder; under 2 minutes.

Outputs • Weekly purchase list — what to buy next week and how much. • Cost by market — the list at Food Bundles prices by default; “Compare” adds a public market or own supplier side by side. • Menu du jour — the dish to push this week, with a one-line reason.

4. MVP scope Everything not in the left column waits for pilot feedback.

In the MVP                                                        Later

Sign-up with phone + OTP                                          iOS release

Menu by photo or typing; automatic standard recipes               Voice input

Weekly sales: typed or photo of sales / POS report                POS integration

Weekly purchase list with safety buffer                           Waste and yield tuning per ingredient

Cost by market: FB default, compare 2 more sources, best          True-cost settings if time is short mix

Menu du jour suggestion                                           PDF / WhatsApp reports

My dishes: cost, margin, money-losing flags, 3-month price        Price-lock contracts

Send purchase list to Food Bundles (main button) or share         In-app payments

Internal sourcing dashboard                                       More markets, cities, Cameroon

5. Screens Nine mobile screens and two dashboard pages; every result within 3 taps of home.

#        Screen                      What it shows

1        Sign-up                     Phone, OTP, name, location, language

2        Add menu                    Photo or typed list → extracted dishes and prices; one tap to confirm

3        Weekly sales                Portions per dish, or photo; review extracted numbers, confirm

4        This week (home)            Purchase list total at FB prices, menu du jour, dishes losing money

5        Purchase list               Ingredients and quantities; edit; “Send to Food Bundles” (main) or share

6        Cost by market              FB column by default; “Compare” adds up to 2 sources; cheapest per item; best mix

7        Menu du jour                Suggested dish and reason

8        My dishes                   Cost and margin per dish; standard recipe (adjustable); 3-month price

9        Settings and help           Compare sources, own supplier prices, target food-cost %, buffer %; contact Food Bundles sales

D1       Sourcing demand (web)       Expected kg per product per week, 12 weeks ahead; CSV export

D2       Operations (web)            Restaurants, incoming orders, weekly market price entry, forecast accuracy

6. Core logic Every number comes from these formulas, never from the AI. Keep them in one costing module with unit tests.

Purchase list Expected portions next week per dish = weighted average of the last 4 weeks (latest 40%, the three before 20% each; fewer weeks = simple average) × (1 + safety buffer, default 10%). Quantity to buy = sum over dishes of (expected portions × quantity per portion ÷ yield %), rounded up to the selling unit.

Cost by market Default = Food Bundles price list (today). “Compare” adds up to 2 sources (a public market such as Kimironko or Nyabugogo, or own supplier): list total per source, price per item, cheapest per item, best mix (each item at its cheapest source). Optional per source: waste % and transport (per trip × trips per week). Every price shows source and date. Results stay honest, including when another market is cheaper. A Food Bundles item without a price shows “not available” and is left out of the total with a note.

Menu du jour Score each dish by its margin at Food Bundles prices this week, boosted when its main ingredients are cheaper than their 8-week average. Suggest the top dish; skip dishes suggested in the last 3 days; show the reason.

My dishes Dish cost = sum of (quantity ÷ yield %) × unit price. Food-cost % = cost ÷ selling price (excl. VAT). Margin = price − cost. Red flag above target + 5 points; weekly sales show how much each red dish loses. 3-month price = forecast mid cost ÷ target food-cost %, rounded up to RWF 100 or 500.

Demand forecast (internal) Sum all purchase lists per product; project 12 weeks from sales trend and seasonality; store low / mid / high. Food Bundles buys against confirmed orders plus a safety margin, never against the forecast alone.

## 7. AI models and tasks (recommended Meta models)

Meta models handle reading, visual understanding, extraction, recipe drafting and explanations. **All prices, stock calculations, purchase quantities and forecasts must come from application data and deterministic formulas / Prophet—not from an AI model.** Call models from the backend and keep model IDs in configuration.

| Task | Recommended Meta model(s) | Expected output |
|---|---|---|
| Read menu photos and extract dishes/prices | [Muse Spark series](https://dev.meta.ai/models/muse-spark); [Muse Wonder](https://dev.meta.ai/models/muse-wonder) as an alternative for complex interpretation | Strict JSON: `{"dishes":[{"name":"...","price_rwf":0,"category":"..."}]}` |
| Build a standard recipe for each dish | [Muse Spark series](https://dev.meta.ai/models/muse-spark) or [Muse Wonder](https://dev.meta.ai/models/muse-wonder) | Strict JSON: `{"lines":[{"sku":"...","quantity":0,"unit":"..."}],"unmatched":[]}`. Use catalog SKUs only. |
| Read weekly sales-report photos | [Muse Spark series](https://dev.meta.ai/models/muse-spark) | Strict JSON: `{"sales":[{"dish_id":"...","portions":0}],"unmatched":[]}` |
| Inspect delivery / supply photos and describe visible quality issues | [Muse Spark series](https://dev.meta.ai/models/muse-spark) with [SAM 3.1](https://dev.meta.ai/models/sam-3-1) for visual segmentation/localization where useful | Strict JSON containing product/SKU candidate, six pass/watch/fail checks, score, visible issues and estimated count/weight range. Return `null` rather than guessing when quantity is not reliably visible. The chef’s actual weight/count overrides every AI estimate. |
| Generate or edit supporting menu imagery, if needed | [Muse Image](https://dev.meta.ai/models/muse-image) | Image asset only; never use generated imagery as evidence of actual stock, quality, quantity or prices. |
| Explain menu du jour, costing flags or price changes | [Muse Spark series](https://dev.meta.ai/models/muse-spark) or [Muse Wonder](https://dev.meta.ai/models/muse-wonder) | One or two plain sentences in the chef’s selected language (Kinyarwanda, English or French). Explain results computed by the application; do not invent figures. |
| Transcribe voice input if voice is introduced in a later phase | [Muse Voice Transcribe](https://dev.meta.ai/models/muse-voice-transcribe) | Transcript for user review. Voice input remains outside the initial MVP unless scope is explicitly changed. |
| Translate UI and dish names | Prefer reviewed/pre-translated strings for `rw / en / fr`; evaluate Muse models for assisted drafts | Human-reviewed translations; do not assume a model guarantees accurate Kinyarwanda or food terminology. |
| Forecast ingredient prices | Python + Prophet nightly job; **no AI model** | Low / mid / high per product, source and month, only when sufficient history exists. |

### Model access and deployment

- Use the [Meta Model API](https://dev.meta.ai/products/meta-model-api) for supported hosted models, including the Muse models above.
- Evaluate the open-weight [Muse Glimmer](https://dev.meta.ai/models/muse-glimmer) and [Muse Spark Open](https://dev.meta.ai/models/muse-spark-open) for self-hosted or controlled deployment where their capabilities and licensing fit the task.
- Use [Muse Code](https://dev.meta.ai/lp/muse-code) as the recommended coding agent to accelerate development; it is a developer tool, not a runtime model for restaurant users.
- Keep model names/IDs, provider settings and timeouts in environment/configuration. Confirm API availability, model capabilities, pricing, rate limits and deployment requirements before implementation.
- Validate strict JSON and retry once; use only catalog SKUs; require the chef to confirm extracted menu, sales and delivery results; cache recipes by dish name; use a 20-second timeout; keep images under 1 MB where practical; log each call’s purpose, model, input/output, latency and cost. Adjusted recipes and confirmed delivery checks may inform future model improvement only under the project’s privacy and consent rules.

8. Price forecast job Nightly, for the top 20 products, per source (Food Bundles and public markets), 3 months ahead. 1. Load daily prices: Food Bundles history, MINAGRI e-Soko / NISR, weekly field checks. 2. Resample to weekly medians; drop zero or over 5× median. 3. One Prophet model per product and source, yearly seasonality; Season A/B months as regressors if accuracy improves. 4. Predict 13 weeks, aggregate to months, save low / mid / high. 5. Under 12 months of history: “current price only.” Own-supplier prices are never forecast. 6. Backtest the last 3 months; show error per product on the dashboard. Then refresh demand forecast and purchase list costs.

9. Architecture and stack The app has its own backend; it reads Food Bundles prices as the default and calls supported Meta models through the Meta Model API, with open-weight options evaluated separately.

Food Bundles app (Menu du Jour)                                             Internal dashboard
Android · rw / en / fr                                       FB staff: sourcing, market prices

Menu du Jour backend Costing engine · PostgreSQL · OTP

Muse Spark series / Muse Wonder                          Price forecast job                                Food Bundles system
Reads menus and sales photos                          Prophet, nightly                              Catalog, live prices (default)
Builds recipes, explains                      Price and demand ranges                               Orders, price history

Market price data e-Soko, NISR, field checks

Layer                            Choice

Mobile app                       Flutter, Android first; low-end phones and 3G

Backend                          Python FastAPI, REST + JSON, OpenAPI docs

Database                         PostgreSQL (Supabase fine), row-level security, daily backups

Internal dashboard               Simple web app, Food Bundles staff login

AI                               Meta Model API for supported Muse models; evaluate Muse Glimmer / Muse Spark Open for self-hosting

Forecasting                      Python + Prophet, nightly cron

Auth and push                    SMS OTP (Africa’s Talking or Twilio); Firebase Cloud Messaging

10. Data model Fourteen PostgreSQL tables. fb_sku on each ingredient is the key link to Food Bundles.

Table                      Key fields
restaurants                id, name, phone, location, type, language, target_food_cost_pct (30), safety_buffer_pct (10),
price_rounding (500)
dishes                     id, restaurant_id, name, selling_price_rwf, category, is_active
ingredients                id, sku, fb_sku, name_rw / en / fr, unit, selling_unit, default_yield_pct
recipe_lines               dish_id, ingredient_id, quantity, unit, yield_pct, ai_generated, adjusted_by_user
sales_reports              restaurant_id, week_start, dish_id, portions_sold, input_method (typed / photo)
purchase_lists             restaurant_id, week_start, items (JSON), totals_by_source (JSON)
price_sources              id, type (fb default / market / supplier), name, restaurant_id (supplier only), transport, trips,
waste_pct
prices                     ingredient_id, source_id, date, price_rwf_per_unit
price_forecast             ingredient_id, source_id, month, low, mid, high, run_date
demand_forecast            ingredient_id, week_start, low_kg, mid_kg, high_kg, run_date
menu_du_jour               restaurant_id, date, dish_id, reason
order_requests             restaurant_id, purchase_list_id, status, fb_order_id
alerts                     restaurant_id, type, message, sent_at, read_at
ai_calls                   purpose, model, input, output, latency_ms, cost_usd

Costs are computed on read, not stored. Each restaurant reads only its own rows; only demand totals cross restaurants.

11. API The app talks only to the Menu du Jour backend; the backend alone talks to the Food Bundles system.

Method             Path                                               Purpose

POST               /auth/otp/request, /auth/otp/verify                Login

GET, PUT           /restaurant                                        Profile and settings

POST               /menu/import                                       Photo or text → dishes; recipes built automatically

GET, PUT           /dishes, /dishes/{id}                              Dishes, cost, margin, recipe, 3-month price

POST, GET          /sales-reports                                     Weekly sales (typed or photo); history

GET                /home                                              This week’s summary

GET                /purchase-list?week=                               Suggested quantities, priced at FB

GET                /purchase-list/compare?sources=                    Cost by market, cheapest per item, best mix

GET                /menu-du-jour                                      Suggested dish with reason

GET, POST,         /price-sources,                                    Sources; own supplier prices
PUT                /price-sources/{id}/prices

POST               /orders                                            Send purchase list to Food Bundles

Backend → Food Bundles system Method             Path                                            Use

GET                /catalog                                        Products, fb_sku, units

GET                /prices?date=                                   Today’s prices (default cost source)

GET                /price-history                                  Forecast training data

POST               /orders                                         Create order; returns fb_order_id

No API yet? Start with a nightly CSV export and staff-entered orders in the dashboard. Decide on day 1.

12. Branding, UX and privacy The app looks and feels like Food Bundles, and stays simple enough for a busy chef. • Brand: Food Bundles logo (green basket with leaves and wordmark; files supplied by Food Bundles), brand green #00D048, Calibri or a metric-compatible font. • Contact: help screen links to Food Bundles sales — WhatsApp 0796 897 823, sales@food.rw. • UX: low-end Android and 3G; home loads under 3 s; every forecast is a range; every price shows source and date; any result within 3 taps. • Purchase list: “Send to Food Bundles” is the main button; sharing with another supplier stays available. • Privacy: recipes, margins, sales and own-supplier prices are private to each restaurant; only anonymous totals feed sourcing. Follow Rwanda Law No. 058/2021. • Engineering: dev and prod environments; secrets in environment variables; README and OpenAPI docs; unit tests for every formula.

13. 10-day plan and acceptance A team of three (mobile, backend/AI, part-time data) builds in parallel; Food Bundles recruits 10 pilot restaurants from day 1.

Day             Milestone

1–2             Repos, database, OTP login, Food Bundles catalog and price sync

1–4             Price data and forecast job for 20 products, backtest logged

3–5             Menu photo import

4–7             Automatic recipes and weekly sales (typed and photo)

6–8             Purchase list, cost by market (FB default + compare), home

8               Menu du jour, internal sourcing dashboard, send to Food Bundles

9               Branding pass, translations, low-end phone testing, fixes

10              Pilot live with 10 restaurants

Acceptance criteria • Sign-up to first purchase list in under 10 minutes; weekly sales entry in under 2 minutes. • Quantities and costs match a hand-calculated sheet for 5 test dishes. • Cost by market opens on Food Bundles prices; comparing adds correct side-by-side totals. • Menu du jour shows a dish and a reason. • No AI recipe line uses an ingredient missing from the catalog.

• A list sent to Food Bundles arrives within 1 minute. • Food Bundles branding applied on every screen; rw / en / fr complete. • No restaurant can see another’s data (tested).

14. Risks The biggest risk is thin price history; show ranges honestly and start with the 20 most-traded products.

Risk                                       Mitigation

Too little price history                   Combine FB, public and field-check data; forecast only with 12+ months

AI recipes or portions off                 Templates for 30 common Rwandan dishes; restaurants can adjust; compare lists with actual buying

Blurry or handwritten menus /              Typing fallback; photo tips screen reports

Restaurants skip weekly sales              Monday reminder; reuse last week’s numbers if skipped

Restaurants fear sharing data              Clear privacy promise; data private by default

Market prices go stale                     Weekly field checks; every price dated

Timeline slips                             Cut 3-month price, then true-cost settings; never cut sales input or cost by market

15. Answer on day 1 • API or CSV export from the Food Bundles system? • Who exports the catalog with SKUs and selling units? • How many months of price history exist, and for which products? • Which 20 products and which public market for the MVP? • Who does weekly market price checks? • Which 10 pilot restaurants, and who supports them? • Which AI provider and hosting accounts, and who pays? • Logo and brand asset files for the developer.

---

# Document 2 — Menu du Jour: Food Bundles Chef App
*Pitch, Product and Developer Brief — source PDF dated 27 October 2026*

FOOD BUNDLES

Menu du Jour — Food Bundles Chef App Order right. Receive right. Know your stock before service. 27 October 2026 · Prepared by Dioscore Shikama, CEO, Food Bundles Ltd

Menu du Jour is the Food Bundles chef app that controls every delivery at the kitchen door and lets the chef order the kitchen’s stock himself. This document has three parts: the pitch (for everyone), the product (for chefs, owners and the Food Bundles team), and the developer brief.

Part A — The pitch For chefs, restaurant owners, investors, partners and the Food Bundles team.

A1. The problem In most Kigali kitchens, nobody properly checks what arrives. Crates come in short, produce is bruised or overripe, prices differ from what was agreed, and none of it is recorded. The chef finds out during service, when an ingredient runs out or a dish has to come off the menu. Ordering happens by phone calls and memory, owners can’t see what was ordered or received, and every loss quietly eats the margin.

A2. The solution: one daily loop A simple loop the chef runs every day from a basic Android phone. Along the way, the app also shows what each dish costs and suggests a menu du jour that uses what is in stock.

1. Order                    2. Receive and check                 3. Know the stock                 4. Reorder
Suggested from sales                   Photo quality check,               Before service:                Shortfalls feed
and stock                          weight and price                on hand, value, gaps             the next order

Every day, from the chef’s phone. Every step sends a signal to Food Bundles.

1. Order. The app suggests what to buy from sales and current stock. The chef buys on Food Bundles directly, or sends the order to the owner to approve, edit and pay. 2. Receive and check. At delivery the chef photographs each crate. The app checks quality (freshness, ripeness, damage, spoilage, size, foreign matter) and estimates quantity. The chef records the real weight and price, then accepts, accepts part, or rejects. 3. Know the stock. Before service the chef sees what is on hand, what it is worth and what will run out. 4. Reorder. Shortfalls feed straight into the next order.

A3. Why each side wants it For                      Why

Chefs                    It is their app: records follow them from kitchen to kitchen, and it proves they run a tight kitchen. Under a minute per delivery item; works on a basic Android phone in Kinyarwanda, English or French.

Restaurant owners        Every order comes to them for approval; every delivery is checked, weighed and priced. Short deliveries and poor quality are caught at the door, not found in the bill. Stock and spending are visible without being in the kitchen.

Food Bundles             Every delivery check is quality feedback on farmers and aggregators (traceability). Every order and stock reading is demand data for sourcing. Chefs order from Food Bundles prices by default, with restaurant credit and vouchers as the next step.

A4. Market landscape Parts of this exist worldwide; the combination does not. Ordering apps stop at the door, back-office tools charge monthly fees and serve owners, and recipe apps belong to the chef but do not buy or receive anything.

Product                          What it does                                     What it lacks for Rwandan kitchens

Choco (Europe, US)               Free ordering app connecting restaurants and     No delivery quality check, stock or costing many suppliers

MarketMan, Apicbase,             Inventory, ordering, recipe costing; AI order    Owner-focused; monthly fees out of reach for
Restaurant365                    suggestions                                      most Kigali restaurants

meez (US)                        Chef-owned recipe and costing tool; free for     No buying, receiving or stock individual chefs

Vendease (Nigeria, Ghana)        Supplier with app: procurement, inventory,       Closest model; not in Rwanda; no chef-owned
invoicing, buy-now-pay-later                     account

Menu du Jour (Food               Chef-owned account + ordering with owner         Free to use, paid for by supply; built for
Bundles)                         approval + photo quality control at delivery     Rwanda
+ morning stock

AI recipe building and AI order suggestions are already standard elsewhere, so they are not the pitch. The edge is the combination: chef ownership, control at delivery, Food Bundles prices and farm supply, and restaurant credit.

A5. Business model • Free for chefs and restaurants. No subscription. • Revenue from supply: orders placed with Food Bundles at its prices, with the app making Food Bundles the default choice. • Next revenue: restaurant credit and vouchers, underwritten by order, delivery and stock history. • Lower costs: better demand data cuts waste and over-buying from farmers; quality feedback cuts returns.

A6. What the pilot must prove Measure                                                             Why it matters

Share of deliveries checked by photo                                Chefs adopt control at delivery

Short or poor deliveries caught                                     Real money saved for owners

Orders placed through the app (chef purchase or approved)           The app drives buying

Repeat ordering from Food Bundles                                   Supply revenue follows

Morning stock opened before service                                 Daily habit formed

Part B — The product How it works for chefs, restaurant owners and the Food Bundles team.

B1. Who uses it • Chef (account owner): one account per person (phone + OTP). Owns every record: orders, deliveries, quality checks, stock, menu, sales. • Kitchens: each restaurant the chef works for is a separate kitchen in the account; the chef switches from the top bar and records never mix. When the chef changes jobs, past kitchens are archived and kept. • Restaurant owner: if the restaurant has a Food Bundles account, the chef links the kitchen to it (the owner approves). The owner then approves orders and sees what the chef shares. • Food Bundles team: web dashboard with signals on demand, orders, delivery quality and stock. • Branding: Food Bundles (logo, green #00D048, Calibri). Open to any chef, customer of Food Bundles or not. Kinyarwanda, English, French; RWF.

B2. Ordering Every purchase list ends in two buttons.

Buy on Food Bundles myself                           Submit to restaurant

Who can use it        Any chef                                             Chefs whose kitchen is linked to the restaurant’s Food Bundles account

Who decides           The chef                                             Owner or manager: approve, edit items or quantities, or reject with a note

Who pays              The chef, through Food Bundles checkout (MoMo,       The restaurant, through its Food Bundles account
card, cash on delivery)                              (MoMo, card, credit or vouchers)

Record                Kept in the chef’s kitchen, marked “paid by chef”    Kept in the kitchen and the restaurant account; edits shown to the chef

Order statuses: draft → submitted → approved, edited or rejected → ordered → delivered → checked in. Owner controls: auto-approve limit (RWF), weekly budget shown to the chef, allowed items, reminder after 2 hours pending. Kitchens not linked can share the list with the owner by WhatsApp or PDF.

B3. Control at delivery The heart of the app. Under one minute per item. 1. Pick the supplier (Food Bundles by default, or another) and the order it belongs to. 2. Photograph each crate, bag or tray. The app identifies the product, runs the checklist and estimates the quantity. 3. Enter the real weight or count, and the price per unit. If the price is left blank, that day’s Food Bundles price is used and labelled “Food Bundles reference price.” 4. Accept, accept part, or reject. Accepted quantities go into stock; the order shows any shortfall automatically.

Check                       What the app looks for

Freshness                   Wilting, dull colour, dry stems or leaves

Ripeness                    Under- or over-ripe for the product

Damage                      Bruising, cuts, crushed items

Check                       What the app looks for

Spoilage                    Mould, rot, leaks, soft or bad spots

Size and grade              Uniform size; matches the grade ordered

Foreign matter              Soil, stones, insects, other products mixed in

Each check is pass / watch / fail, with a score from 0 to 100. The app only flags what is visible; the chef decides. Quantity from a photo is always labelled “estimate” and the chef’s weight always replaces it.

B4. Morning stock Before service, the chef sees each ingredient’s quantity on hand, its value in RWF, days of cover and low-stock flags. A quick count corrects any item. Stock on hand is subtracted from the next purchase list, and the menu du jour favours dishes that use older stock to cut waste.

B5. Kitchen insights (supporting features) • Menu setup: photo or typed menu; AI builds a standard recipe per dish, which the chef can adjust. • Weekly sales: portions per dish, typed or from a photo of the sales report (under 2 minutes). • Menu du jour: the dish to push, chosen for margin, cheap ingredients this week and stock to use up. • My dishes: cost, margin and money-losing flags; suggested price for the next 3 months. • Cost by market: the purchase list at Food Bundles prices by default; “Compare” adds a public market or own supplier. • Suppliers: delivery frequency, quality score, reject rate and price paid vs Food Bundles, per supplier.

B6. Sharing with a restaurant The chef chooses what a linked restaurant sees and can stop sharing at any time. Records already shared about the restaurant’s own operations stay with the restaurant; recipes stay the chef’s unless shared.

Data                                   Default       Restaurant receives

Order requests                         On            Orders to approve, edit or reject and pay

Deliveries and quality checks          On            Supplier, quantity, weight, price, score, rejects

Morning stock                          On            Daily stock, value, low-stock flags

Sales and dish margins                 Off           Weekly portions, cost and margin per dish

Recipes                                Off           The chef’s recipes, only by choice

B7. Screens #       Screen                             What it shows                                                                Phase

1       Sign-up and kitchens               Phone, OTP, language; create, switch, archive kitchens                       MVP

2       Today (home)                       Deliveries expected, morning stock alerts, order status, menu du jour        MVP

3       Order                              Suggested list minus stock; edit; “Buy on Food Bundles” / “Submit to         MVP /
restaurant”                                                                  2

4       Orders                             Status and edits by the owner                                                MVP

5       Receive supply                     Camera, checklist, estimate, weight and price, accept / part / reject        MVP

6       Morning stock                      Quantity, value, days of cover, low stock; quick count                       MVP

7       Add menu                           Photo or typed list; automatic recipes                                       MVP

8       Weekly sales                       Portions per dish or photo                                                   MVP

9       Suppliers                          Frequency, quality, reject rate, price vs FB                                 2

10      Menu du jour and My                Suggested dish; cost, margin, 3-month price                                  2 dishes

11      Cost by market                     FB default; compare up to 2 sources                                          2

12      Sharing and settings               Linked restaurant, scopes; buffer %, targets; help (WhatsApp 0796 897 823,   MVP /
sales@food.rw)                                                               2

D1      FB dashboard (web)                 Signals, demand, orders, delivery quality by farmer / aggregator, short      MVP deliveries

R1      Restaurant approvals (in           Approve, edit, reject, pay; auto-approve limit and budget                    2 its FB account)

B8. Scope and phases The core loop ships first; supporting insights follow.

MVP, days 1–10 (core loop)                      Phase 2, days 11–17                         Later

Chef account, kitchens                          Kitchen link to restaurant account;         iOS sharing scopes

Menu by photo or typing; automatic              Submit to restaurant: approve, edit,        POS integration
recipes                                         pay; auto-approve, budget

Weekly sales (typed or photo)                   Supplier record                             Voice input

Purchase list minus stock; buy on Food          Menu du jour; My dishes; 3-month            Price-lock contracts
Bundles                                         price (forecast job)

Delivery check-in: photo quality check,         Cost by market compare                      True-cost settings weight, price, accept / reject

Morning stock and quick count                   Low-stock signal                            More cities, Cameroon

Signals: demand, order, quality, reject,        Signals: approvals, pending, links short delivery; FB dashboard

Part C — Developer brief Everything the development team needs to build it.

C1. Core logic Every number comes from these formulas, never from the AI. Keep them in one costing module with unit tests. All logic runs per kitchen.

Purchase list Expected portions next week per dish = weighted average of the last 4 weeks (latest 40%, the three before 20% each) × (1 + safety buffer, default 10%). Quantity to buy = sum over dishes of (expected portions × quantity per portion ÷ yield %) − stock on hand, rounded up to the selling unit.

Delivery check-in • Quality: six checks, each pass / watch / fail; score 0–100. The chef decides accept / part / reject. • Quantity: AI estimate (count, or kg range) labelled “estimate”; the chef’s weight or count replaces it. • Price: chef entry; if blank, that day’s Food Bundles price, labelled “FB reference price.” • Short delivery: accepted quantity more than 5% below the ordered quantity.

Morning stock Opening stock today = closing stock yesterday + accepted deliveries − expected use yesterday. Expected use = (weekly sales ÷ days open) × quantity per portion ÷ yield %.

A quick count replaces the calculation from that day. Days of cover = stock ÷ expected daily use; low stock under 1 day.

Supporting (phase 2) • Dish cost = sum of (quantity ÷ yield %) × unit price; food-cost % = cost ÷ price (excl. VAT); red above target + 5 points. • 3-month price = forecast mid cost ÷ target food-cost %, rounded up to RWF 100 or 500. • Menu du jour: best margin at FB prices, boosted for ingredients cheaper than their 8-week average and for older stock; skip the last 3 days’ picks. • Cost by market: FB default; compare up to 2 sources; cheapest per item; best mix; honest when another market is cheaper.

C2. Signals to the Food Bundles dashboard The backend writes each event to signals_outbox and pushes it to the Food Bundles system with retries.

Signal                 Trigger                          Sent                 Food Bundles uses it for                        Phase

Demand                 Purchase list created            Anonymous            12-week sourcing from farmers and               MVP
totals               aggregators

Order placed           Chef purchase or                 Always               Fulfilment; payer recorded                      MVP approved order

Delivery quality       Check-in of an FB                Always               Quality per farmer / aggregator; traceability   MVP delivery

Reject / partial       Item rejected or                 FB deliveries        Replacement or credit note same day             MVP part-accepted

Short delivery         Gap over 5%                      FB deliveries        Packing and transport checks                    MVP

Order request /        Submitted; approved,             Always               Follow demand; learn why orders are cut         2
result                 edited, rejected

Pending approval       Over 2 hours                     Always               Sales nudges the approver                       2

Low stock              Under 1 day of cover             If the chef          Same-day reorder offer                          2 allows

Kitchen link           Chef links to a restaurant       Always               Onboarding and account support                  2

Data about other suppliers is never sent to Food Bundles. Payload: event type, kitchen ID, product fb_sku, quantity, score or gap, timestamp.

## C3. AI tasks (recommended Meta models)

Meta models read, inspect, extract and explain. **Prices, stock balances, purchase quantities and forecasts come from application data and deterministic formulas / Prophet, never from model guesses.** Call models from the backend and keep model IDs in configuration.

| Task | Recommended Meta model(s) | Output / safeguards |
|---|---|---|
| Check supply/delivery photos | [Muse Spark series](https://dev.meta.ai/models/muse-spark) with [SAM 3.1](https://dev.meta.ai/models/sam-3-1) for visual segmentation/localization where useful | Strict JSON: SKU/product candidate, six `pass / watch / fail` checks, score, visible issues and estimated count/weight range. Return `null` rather than guessing if not fully visible; label estimates clearly; chef’s actual weight/count wins. |
| Read menu photos | [Muse Spark series](https://dev.meta.ai/models/muse-spark); [Muse Wonder](https://dev.meta.ai/models/muse-wonder) for complex interpretation | Strict JSON: `{"dishes":[{"name":"...","price_rwf":0,"category":"..."}]}` |
| Build standard recipes | [Muse Spark series](https://dev.meta.ai/models/muse-spark) or [Muse Wonder](https://dev.meta.ai/models/muse-wonder) | Strict JSON: `{"lines":[{"sku":"...","quantity":0,"unit":"..."}],"unmatched":[]}`. Catalog SKUs only. |
| Read sales-report photos | [Muse Spark series](https://dev.meta.ai/models/muse-spark) | Strict JSON: `{"sales":[{"dish_id":"...","portions":0}],"unmatched":[]}` |
| Explain a suggestion | [Muse Spark series](https://dev.meta.ai/models/muse-spark) or [Muse Wonder](https://dev.meta.ai/models/muse-wonder) | One or two sentences in the chef’s selected language; explain computed results without inventing figures. |
| Generate supporting imagery, if needed | [Muse Image](https://dev.meta.ai/models/muse-image) | Optional image generation only; never treat generated imagery as evidence of real deliveries or stock. |
| Voice transcription, if added in a later phase | [Muse Voice Transcribe](https://dev.meta.ai/models/muse-voice-transcribe) | Transcript for user review. Voice input remains outside the MVP unless scope is explicitly changed. |
| Translate UI and dish names | Reviewed/pre-translated strings for `rw / en / fr`; model-assisted drafts may be evaluated | Human-review all translations, especially Kinyarwanda and food terminology. |
| Forecast prices (phase 2) | Python + Prophet nightly job; **no AI model** | Low / mid / high per product, source and month, subject to the 12-month history rule. |

### Model access and deployment

- Use the [Meta Model API](https://dev.meta.ai/products/meta-model-api) for supported hosted models.
- Evaluate open-weight [Muse Glimmer](https://dev.meta.ai/models/muse-glimmer) and [Muse Spark Open](https://dev.meta.ai/models/muse-spark-open) for self-hosting where capabilities, hardware and licensing fit.
- Use [Muse Code](https://dev.meta.ai/lp/muse-code) as the recommended coding agent for development, not as a runtime model in the restaurant app.
- Confirm model/API availability, exact IDs, capabilities, pricing, rate limits and hosting requirements before implementation.
- Validate JSON and retry once; use catalog SKUs only; require chef confirmation for AI results; keep estimates labelled; use a 20-second timeout; keep photos under 1 MB where practical; log model, purpose, input/output, latency and cost. Confirmed delivery checks and adjusted recipes may inform future improvement only under appropriate privacy and consent controls.

C4. Price forecast job (phase 2) 1. Load daily prices: Food Bundles history, MINAGRI e-Soko / NISR, weekly field checks. 2. Weekly medians; drop zero or over 5× median. 3. One Prophet model per product and source; yearly seasonality; Season A/B as regressors if accuracy improves. 4. Predict 13 weeks; save monthly low / mid / high. Under 12 months of history: “current price only.” 5. Backtest the last 3 months; show error per product on the dashboard.

C5. Architecture and stack One backend serves the chef app and the Food Bundles dashboard, reads Food Bundles prices, calls supported Meta models through the Meta Model API, and pushes signals and shared data to the Food Bundles system.

Food Bundles Chef app                                                          FB dashboard
Menu du Jour · Android · rw / en / fr                                      Signals, sourcing, quality, prices

Chef app backend Costing, stock, signals · PostgreSQL

Muse Spark series / Muse Wonder                               Price forecast job                                   Food Bundles system
Reads menus, sales, supply photos                            Prophet, nightly                                   Prices, orders, restaurant
Quality check, recipes                            Price and demand ranges                                 accounts (shared data in)

Market price data e-Soko, NISR, field checks

Layer                             Choice

Mobile app                        Flutter, Android first; offline check-in with later sync; low-end phones and 3G

Backend                           Python FastAPI, REST + JSON, OpenAPI docs

Database and files                PostgreSQL with row-level security by chef and kitchen; photos in object storage

FB dashboard                      Web app, Food Bundles staff login

AI                                Meta Model API for supported Muse models; evaluate Muse Glimmer / Muse Spark Open for self-hosting

Integration                       Signals outbox with retries; restaurant link by owner approval

Auth and push                     SMS OTP (Africa’s Talking or Twilio); Firebase Cloud Messaging

C6. Data model Every operational row carries kitchen_id; every kitchen belongs to one chef. fb_sku links each ingredient to Food Bundles.

Table                             Key fields
chefs                             id, name, phone, language
kitchens                          id, chef_id, restaurant_name, location, days_open, safety_buffer_pct, target_food_cost_pct,
status
kitchen_links,                    kitchen_id, fb_restaurant_account_id, status, approved_by; scope, enabled
share_scopes

approval_rules                    kitchen_link_id, auto_approve_limit_rwf, weekly_budget_rwf, allowed_skus
ingredients                       id, sku, fb_sku, name_rw / en / fr, unit, selling_unit, default_yield_pct
dishes, recipe_lines              kitchen_id, name, price; ingredient_id, quantity, unit, yield_pct, ai_generated, adjusted
sales_reports                     kitchen_id, week_start, dish_id, portions_sold, input_method
purchase_lists                    kitchen_id, week_start, items, totals_by_source
order_requests                    kitchen_id, chef_id, path (chef_purchase / restaurant_approval), items, edited_items, status,
payer, fb_order_id
deliveries,                       kitchen_id, source_id, order_id, received_at; ingredient_id, photo_url, quality_checks, score,
delivery_items                    estimates, actual_qty, unit_price, price_origin, decision, accepted_qty
stock_daily                       kitchen_id, ingredient_id, date, opening, received, expected_use, counted, closing
price_sources, prices             type (fb / market / supplier); ingredient_id, source_id, date, price
signals_outbox                    type, kitchen_id, payload, created_at, sent_at, attempts
forecasts, menu_du_jour,          price and demand ranges; daily pick and reason; AI log
ai_calls

C7. API The app talks only to its backend; the backend alone talks to the Food Bundles system.

Method             Path                                               Purpose

POST               /auth/otp/request, /auth/otp/verify                Login

GET, POST,         /kitchens[/{id}]                                   Create, switch, archive kitchens PUT

GET                /kitchens/{id}/purchase-list                       Suggested quantities minus stock

POST, GET          /kitchens/{id}/orders                              Chef purchase or submit to restaurant; status and edits

POST, PUT          /kitchens/{id}/deliveries[/items]                  Photo check-in, AI result, weight, price, decision

GET, PUT           /kitchens/{id}/stock[/count]                       Morning stock; quick count

POST               /kitchens/{id}/menu/import                         Menu photo or text; automatic recipes

POST               /kitchens/{id}/sales-reports                       Weekly sales

GET                /kitchens/{id}/insights                            Menu du jour, dishes, cost by market (phase 2)

POST, PUT          /kitchens/{id}/link, /share                        Restaurant link and scopes (phase 2)

Backend → Food Bundles system Method              Path                                              Use

GET                 /catalog, /prices?date=                           Products and default prices

POST                /orders                                           Chef purchase; returns fb_order_id and checkout link

POST                /signals                                          Events from the outbox

POST                /order-requests                                   Chef request to the restaurant account (phase 2)

POST                /chef-app/order-status                            Approved, edited, rejected, ordered, delivered (webhook)

POST                /restaurant-links[/{id}/data]                     Link request; shared records (phase 2)

C8. Branding, UX and privacy • Brand: Food Bundles logo (files from Food Bundles), green #00D048, Calibri or a metric-compatible font. • UX: low-end Android and 3G; check-in works offline; home under 3 s; every price shows source and date; forecasts as ranges. • Ownership: the chef owns the account and records; restaurants see only what is shared; plain-language terms of use. • Privacy: other suppliers’ data never goes to Food Bundles; follow Rwanda Law No. 058/2021; legal review of chef–restaurant sharing terms. • Engineering: dev and prod; secrets in environment variables; README and OpenAPI docs; unit tests for every formula.

C9. Plan and acceptance A team of three (mobile, backend/AI, part-time data) builds in parallel; Food Bundles recruits 10 pilot chefs from day 1.

Day              Milestone

1–2              Repos, database (chefs, kitchens), OTP login, Food Bundles catalog and price sync

3–4              Menu photo import, automatic recipes, weekly sales

4–6              Purchase list minus stock; buy on Food Bundles; order status

5–8              Delivery check-in: photo quality check, estimate, weight, price, decision; offline sync

7–8              Morning stock and quick count; signals outbox; FB dashboard

9                Branding, translations, low-end phone testing, fixes

10               MVP pilot live with 10 chefs

11–13            Kitchen link and sharing; submit to restaurant, approve, edit, pay; auto-approve and budget

14–15            Supplier record; low-stock and approval signals

16–17            Price forecast job; menu du jour; My dishes; cost by market

Acceptance criteria • Delivery check-in under 1 minute per item; chef weight always replaces the estimate; blank price uses the labelled FB reference price.

• Shortfalls against the order are flagged automatically; quality, reject and short-delivery signals reach the FB dashboard within 1 minute or retry. • Morning stock matches a manual calculation for 5 items over 3 days. • Purchase quantities match a hand-calculated sheet for 5 test dishes, minus stock. • A chef purchase reaches Food Bundles checkout marked “paid by chef”; (phase 2) approvals, edits and rejections update the chef’s order status. • A chef with two kitchens sees separate records; archiving keeps history; a linked restaurant sees only shared scopes. • No other-supplier data reaches Food Bundles (tested).

C10. Risks Risk                                       Mitigation

Photo weight estimates off                 Labelled estimate; chef weight wins; estimates shown only where proven reliable

Quality check misses issues                Flags only what is visible; chef decides; track overrides to improve

Chefs skip check-in                        Under 1 minute per item; works offline; reminders when a delivery is expected

Chef–restaurant data disputes              Clear ownership terms; scoped sharing; legal review

Approvals slow buying                      Auto-approve limit; 2-hour reminder; FB sales nudge

Too little price history (phase 2)         Forecast only with 12+ months; otherwise current price

Timeline slips                             Protect the core loop in the MVP; move insights, never the pilot

C11. Answer on day 1 • API or CSV from the Food Bundles system; who builds /orders, /signals, /order-requests and the restaurant approval screen? • Who exports the catalog with SKUs and selling units? • Which 10 pilot chefs and restaurants; who supports them? • Which AI provider, hosting and photo storage accounts? • Logo and brand asset files for the developer.

Sources for the market landscape (A4): MarketMan and Apicbase listings on GetApp (2026); Choco company materials and App Store listing; meez coverage in Restaurant Business and TechCrunch; Vendease coverage in TechCabal and AgFunderNews (2022). Competitor details may have changed since publication.
