# Phase 9: what only Food Bundles can provide

Phase 9 rebuilds the chef app to the Food Bundles UX spec (Nov 18, 2026). Some parts of that spec depend on systems or credentials that only Food Bundles can provide. This file lists each one:
- what we need;
- what the app does until it exists;
- which build stage it affects.

Stages:
1. Foundations and Home
2. Menu & recipe
3. Receive
4. Commands
5. Stock
6. Requisition and Pay/Share

| # | Dependency | What we need from Food Bundles | Fallback until then | Stages |
|---|---|---|---|---|
| 1 | **Live catalogue: prices and pack sizes** | An authenticated API: product id, name, base unit, current FB price, **pack size** (minimum order multiple), active flag, last-updated time. Plus the rate limit and the update frequency. | Seeded catalogue (`refresh_catalog` job on static data). Prices are labelled with their date. Pack size comes from the kitchen's ingredient setting (`selling_unit_size`, default 1). | 2, 3, 6 |
| 2 | **Delivery-quality signal endpoint** | An endpoint to receive per-line issues (short weight, damaged, not fresh), received vs ordered quantity, and photo links, keyed by FB order number. | Issues are stored in the chef app only and visible in its history. Nothing is sent. | 3 |
| 3 | **Payments (MoMo / card)** | A payment API or hosted checkout that turns a requisition into a paid FB order delivered next morning, with a callback for the payment and order status. | "Pay myself" shows **Coming soon** (disabled). We never fake a payment. | 6 |
| 4 | **Restaurant account** | A restaurant (owner) account linked to the kitchen, where a requisition can be approved, edited or paid. | "Send to restaurant" shows **Coming soon** (disabled). WhatsApp share works. | 6 |
| 5 | **Restaurant-sent commands** | A channel (API or webhook) through which the restaurant's POS or waiters send commands, plus the endpoint where the decline message ("Declined – not enough Chicken (short 0.3 kg).") is delivered. | Commands are recorded in the chef app. Waiters and cashiers picked as "Recorded by" create New commands on the chef's phone. Decline messages are stored locally and shown in the command history. | 4 |
| 6 | **FB order feed for Receive** | The status and expected delivery time of each FB order ("On the way", "Expected around 07:30"), and who paid. | Requisitions made in the app are pre-filled into Receive from our own order record. "Expected around" and "paid by" are hidden when unknown. | 1, 3 |
| 7 | **Photo storage credentials** | Credentials and a bucket/folder policy for the object store (Cloudinary is configured but the upload was never built), plus a retention policy. | The "+ Photo" and delivery photo buttons keep the photo **on the device only** and label it as such. It is not uploaded or sent. | 3 |
| 8 | **Staff logins** (follow-up, not Phase 9) | A decision on whether waiters and cashiers get their own phone logins and kitchen membership. | Staff are names and roles per kitchen, picked on the chef's phone for "Recorded by". | 4 |

## Who to ask
To be filled in by the product owner: a contact and a target date for each row.
