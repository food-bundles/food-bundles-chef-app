# Food Bundles Chef App — Backend Integration Design

**Phase 0 deliverable.** Produced by inspecting all mobile source files.  
PDFs (`Menu du Jour.pdf`, `Food_Bundles_Menu_du_Jour_Spec_and_Developer_Brief_261026_193237.pdf`) could not be rendered (poppler not installed). All content below is derived from the TypeScript codebase.

---

## 1. Product Summary

**Tagline:** Order right. Receive right. Know your stock before service.

**Core operational workflow:** Order → Receive → Know Stock → Reorder

**Target market:** Rwanda, Android-first, RWF as primary currency.

**App name:** Food Bundles Chef (Menu du Jour)  
**Bundle ID:** `com.foodbundles.chefapp`  
**Version at time of inspection:** 1.0.0 (Phase 08 label in settings screen)

---

## 2. Mobile Implementation Inventory

### 2.1 Authentication

| Item | Detail |
|---|---|
| Screen routes | `/(auth)/welcome`, `/(auth)/phone-number`, `/(auth)/verify-otp` |
| Flow | Welcome → phone entry → OTP entry → app |
| OTP behaviour | **Mock only** — any 6-digit code accepted. No real SMS sent. |
| Session model | `Chef { id: string; phone: string }` in `session-store.ts` |
| Persistence | In-memory Zustand only. Comment says "production should use expo-secure-store" |
| Phone validation | `phone.replace(/\D/g, '').length >= 9` |
| Backend dependency | None currently wired — pure mock |

### 2.2 Kitchen Management

| Item | Detail |
|---|---|
| Screen routes | `/(app)/kitchens` (list), `/(app)/kitchens/create`, `/(app)/kitchens/[kitchenId]` |
| Domain model | `Kitchen` (see §4) |
| Zustand store | `useKitchenStore` — actions: `setActiveKitchen`, `addKitchen`, `updateKitchen`, `archiveKitchen` |
| SQLite table | `kitchens` (see §7) |
| Repository interface | `KitchenRepository` — `findAll(chefId)`, `findById`, `create`, `update`, `archive` |
| SQLite implementation | `KitchenSQLiteRepository` — fully wired |
| Hydration | `useDataHydration` loads kitchens from SQLite for `chef-0788000001` (hardcoded dev chef ID) |
| Validation | Zod schema: name 2–60 chars, address max 120, cuisineType max 40, seatingCapacity integer ≤ 2000 |
| Active kitchen | Single activeKitchen in store; onboarding redirect if none active |

### 2.3 Dashboard

| Item | Detail |
|---|---|
| Screen route | `/(app)/(tabs)/index` (first tab) |
| Signals shown | Low-stock count, pending order count, delivery count, low-stock item list, procurement reminder |
| Data sources | `useStockStore`, `useOrderStore`, `useDeliveryStore`, `useKitchenStore` |
| Calculations used | `calcDaysOfCover`, `isLowStock` from `expected-use.ts` |
| Sync status | `useSyncStatus` hook polling mutation queue; `SyncStatusBadge` in header |
| Backend dependency | None — all from local Zustand/SQLite |

### 2.4 Menu Management

| Item | Detail |
|---|---|
| Screen route | `/(app)/(tabs)/menu` |
| Domain model | `MenuItem` (see §4) |
| Zustand store | `useMenuStore` — actions: `addItem`, `updateItem`, `toggleActive` |
| SQLite table | `menu_items` — defined in schema but **no SQLite repository implementation exists** |
| Backend dependency | Menu store not wired to SQLite. Mock data only in `MOCK_MENU_ITEMS`. |
| Status | **NOT persisted to SQLite. Backend API required to replace mock.** |

### 2.5 Recipes

| Item | Detail |
|---|---|
| Domain model | `Recipe`, `RecipeIngredient` (see §4) |
| Screen route | No dedicated recipe screen found — recipe data used internally for purchasing calculations |
| Store | No recipe Zustand store found |
| SQLite | No `recipes` table in current schema |
| Status | **Recipes are domain models only — no UI screen, no store, no SQLite table.** |

### 2.6 Sales

| Item | Detail |
|---|---|
| Screen route | `/(app)/sales/entry` |
| Domain model | `SalesRecord` (see §4) |
| Zustand store | `useSalesStore` — actions: `setRecords`, `addRecord`, `getWeeklySales` |
| SQLite table | `sales_records` — fully defined |
| Repository interface | `SalesRepository` — `listByKitchen`, `listByMenuItem`, `create` |
| SQLite implementation | `SalesSQLiteRepository` — wired |
| Calculations | `getWeeklySales` groups by date string (not ISO week), returns last N bucket totals |
| Status | **Wired. Sales persist to SQLite. `getWeeklySales` uses date as bucket key (not ISO week number) — backend must match or define reconciliation.** |

### 2.7 Purchasing / Order Lifecycle

| Item | Detail |
|---|---|
| Screen route | `/(app)/(tabs)/purchasing` — 3-tab: Need to Buy / Catalog / Orders |
| Need to Buy | `calcQuantityToBuy` using TARGET_DAYS_COVER=3, stockItem.dailyUseRate as demand proxy |
| Catalog | `MOCK_CATALOG` (12 products hardcoded). No live API. |
| Order domain model | `Order`, `OrderLineItem` (see §4) |
| Zustand store | `useOrderStore` — actions: `setCartQuantity`, `clearCart`, `submitOrder`, `cancelOrder`, `cartTotal` |
| SQLite table | `orders` + `order_line_items` — defined in schema |
| Order repo | **No order SQLite repository implementation found** |
| Status | **Order store not wired to SQLite. Orders lost on app restart.** |

### 2.8 Food Bundles Catalog

| Item | Detail |
|---|---|
| Domain model | `CatalogProduct` (see §4) |
| Data source | `MOCK_CATALOG` — 12 hardcoded Rwandan products with SKUs (e.g. `FB-VEG-001`) |
| Categories in mock | Vegetables, Oils & Fats, Grains & Flours, Meat & Fish, Legumes, Spices & Condiments, Fruits |
| Backend dependency | **No catalog repository or API integration exists. Backend must provide live catalog endpoint.** |

### 2.9 Delivery Receiving

| Item | Detail |
|---|---|
| Screen routes | `/(app)/receiving` (list), `/(app)/receiving/[deliveryId]` (detail), `/(app)/receiving/[deliveryId]/item/[lineItemId]` (receive item) |
| Domain models | `Delivery`, `DeliveryLineItem`, `DeliveryStatus`, `QualityAssessment`, `AcceptanceDecision`, `PriceRecord` |
| Receiving flow | camera → AI assessment → manual entry → accept/partial-accept/reject |
| Photo handling | `expo-camera` capture → `expo-image-manipulator` resize to 1024px wide, JPEG 0.8 quality, validated ≤ 1 MB (`MAX_PHOTO_SIZE_BYTES = 1_000_000`) |
| AI assessment | `mockQualityAdapter` — simulates 1.2s latency, random quality results. No real AI. |
| Zustand store | `useDeliveryStore` — `setDeliveries`, `updateLineItem`, `startDelivery`, `completeDelivery` |
| SQLite table | `deliveries` + `delivery_line_items` — fully defined |
| Repository | `DeliverySQLiteRepository` — wired |
| Status | **Wired to SQLite. Photo stored as local URI (not uploaded to remote storage).** |

### 2.10 Inventory / Stock

| Item | Detail |
|---|---|
| Screen route | `/(app)/(tabs)/stock` |
| Domain model | `StockItem` (see §4) |
| Zustand store | `useStockStore` — `setItems`, `getLowStockItems`, `updateQuantity`, `updateDailyUseRate` |
| SQLite tables | `stock_items` + `stock_movements` — both defined |
| Repository | `StockSQLiteRepository` — wired |
| Movement reasons | `'delivery' | 'manual_adjustment' | 'opening_count' | 'daily_use'` |
| Status | **Wired. `dailyUseRate` is stored per stock item — not recalculated from sales at runtime.** |

### 2.11 Offline Sync / Mutation Queue

| Item | Detail |
|---|---|
| SQLite table | `mutation_queue` — fully defined |
| Repository | `MutationQueueSQLiteRepository` — wired |
| Queue shape | `QueuedMutation` (see §8) |
| Flush logic | **None — `useSyncStatus` notes "local-only mode — mutations are queued but never flushed to a server"** |
| Status | **Queue accumulates mutations. No backend sync endpoint or flush logic implemented.** |

### 2.12 Notifications

| Item | Detail |
|---|---|
| Screen route | `/(app)/settings` |
| Service | `src/services/notifications.ts` — `expo-notifications` wrapper |
| Features | Permission request, daily 7:00 AM low-stock reminder (local), delivery-ready notification, low-stock alert |
| Backend dependency | Local push only. Backend would provide server-side push triggers. |
| Status | **Local notifications working. No server-side push configured.** |

---

## 3. Backend-to-Mobile Integration Table

| Mobile capability | Mobile implementation summary | Backend API required | Priority | Notes |
|---|---|---|---|---|
| Chef authentication | Phone + OTP mock. No real SMS. Session in memory only. | `POST /api/v1/auth/otp/request`, `POST /api/v1/auth/otp/verify`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` | **P0** | Must replace mock OTP. Mobile currently hardcodes any 6-digit code. |
| Chef profile | `Chef { id, phone }` only. No name, no email. | `GET /api/v1/chefs/me`, `PATCH /api/v1/chefs/me` | P1 | Mobile schema is minimal. Expand on backend. |
| Kitchen management | Fully wired to SQLite. Zustand + repo. | `POST /api/v1/kitchens`, `GET /api/v1/kitchens`, `GET /api/v1/kitchens/{id}`, `PATCH /api/v1/kitchens/{id}`, `POST /api/v1/kitchens/{id}/archive` | **P0** | Hydration uses hardcoded chefId `chef-0788000001` — must be replaced with JWT claim. |
| Dashboard | 100% local. No backend calls. | `GET /api/v1/kitchens/{id}/dashboard` | P2 | Mobile can remain local initially; backend aggregation useful for multi-device. |
| Menu management | Mock only. No SQLite repo. No backend wiring. | `GET/POST /api/v1/kitchens/{id}/menus`, `GET/PATCH/DELETE /api/v1/kitchens/{id}/menus/{id}` | **P1** | Critical gap — menu data lost on reinstall. |
| Recipes | Domain model only. No screen, no store, no SQLite table. | `GET/POST /api/v1/kitchens/{id}/recipes`, full CRUD | **P1** | Recipes are needed for purchasing engine. Complete gap in mobile. |
| Ingredients | Domain model only. Used in `RecipeIngredient`. No screen. | `GET /api/v1/kitchens/{id}/ingredients`, ingredient search | P1 | Backend canonical ingredient catalog needed. |
| Sales | Wired to SQLite. Weekly bucketing by date string. | `POST /api/v1/kitchens/{id}/sales`, `GET /api/v1/kitchens/{id}/sales` | **P1** | Mobile buckets by date string, not ISO week. Backend must reconcile. |
| Purchasing engine | Uses `stockItem.dailyUseRate` directly (pre-stored, not recalculated). TARGET_DAYS_COVER=3. | `GET /api/v1/kitchens/{id}/purchase-plan` | P1 | Backend should recalculate from recipes+sales. Mobile uses stored rate as proxy. |
| Food Bundles catalog | 12 mock products. No live API integration. | `GET /api/v1/catalog/products`, search, categories | **P0** | Backend must provide live catalog. SKU format: `FB-{CAT}-{NNN}`. |
| Orders | Not wired to SQLite. Lost on restart. Statuses: `draft|submitted|confirmed|out_for_delivery|delivered|cancelled`. | `POST /api/v1/kitchens/{id}/orders`, full CRUD + status history | **P0** | Critical gap — orders must be persisted. Backend is source of truth. |
| Delivery receiving | Wired to SQLite. Photo stored as local URI only. AI is mock. | `GET/POST /api/v1/kitchens/{id}/deliveries`, receiving + photo upload, `POST /deliveries/{id}/quality-assessment` | **P0** | Photos need upload to object storage. AI must be backend-proxied. |
| Quality assessment | Mock adapter — random results. No real AI. | AI backend service (Meta Muse Spark/SAM 3.1) behind `/api/v1/kitchens/{id}/deliveries/{id}/quality-assessment` | P1 | Mobile calls `mockQualityAdapter.assessPhoto(uri, name)`. Backend replaces this. |
| Inventory / stock | Wired to SQLite. `dailyUseRate` stored, not recalculated. | `GET /api/v1/kitchens/{id}/inventory`, stock movements, counts | P1 | Backend should compute `dailyUseRate` from sales; mobile stores it manually. |
| Offline sync | Queue wired. No flush to server. 11 operation types. | `POST /api/v1/sync/push`, `GET /api/v1/sync/pull` | P1 | See §9 for exact mutation envelope. |
| Notifications | Local push only. No server triggers. | Push notification service, notification preferences API | P2 | Backend can send low-stock, delivery-ready events via push. |

---

## 4. Domain Model Field Inventory

### Kitchen
```
id: string              — UUID
chefId: string
name: string
address?: string
cuisineType?: string
seatingCapacity?: number
isArchived: boolean
createdAt: string       — ISO 8601
```

Zod validation: name 2–60 chars, address ≤120, cuisineType ≤40, seatingCapacity integer ≤2000.

### MenuItem
```
id: string
kitchenId: string
name: string
description?: string
category: string
priceRwf: number        — integer RWF (stored as REAL in SQLite)
isActive: boolean
createdAt: string
```

### Recipe
```
id: string
kitchenId: string
menuItemId: string
menuItemName: string    — denormalized
portions: number        — yield in portions
ingredients: RecipeIngredient[]
notes?: string
createdAt: string
```

### RecipeIngredient
```
ingredientId: string
ingredientName: string  — denormalized
quantityPerPortion: number
unit: string
```

**Note:** `Recipe.portions` is a yield expressed as number of portions, not a fraction/percentage. Yield fraction for ingredient calc = not stored — `calcExpectedDailyUse` takes `yieldPercentage` as a separate parameter (default 1.0).

### SalesRecord
```
id: string
kitchenId: string
menuItemId: string
menuItemName: string    — denormalized
date: string            — YYYY-MM-DD ISO date
portionsSold: number
priceRwf: number
```

### StockItem
```
id: string
kitchenId: string
ingredientId: string
ingredientName: string  — denormalized
unit: string
quantityOnHand: number
dailyUseRate: number    — pre-stored, not recalculated at runtime
lastUpdated: string
```

### StockMovement
```
id: string
kitchenId: string
stockItemId: string
ingredientName: string  — denormalized
delta: number           — positive=added, negative=consumed
reason: 'delivery' | 'manual_adjustment' | 'opening_count' | 'daily_use'
referenceId?: string
recordedAt: string
```

### Ingredient
```
id: string
kitchenId: string       — kitchen-owned ingredient records
name: string
unit: string
category?: string
sku?: string            — Food Bundles SKU when applicable
```

### CatalogProduct
```
id: string
name: string
category: string
unit: string
packSize: number        — units per pack/crate
unitPriceRwf: number
inStock: boolean
sku?: string            — format: FB-{CAT}-{NNN}
description?: string
```

### Order
```
id: string
kitchenId: string
status: OrderStatus
lineItems: OrderLineItem[]
totalRwf: number
placedAt?: string
expectedDeliveryAt?: string
notes?: string
createdAt: string
```

### OrderLineItem
```
productId: string
productName: string     — denormalized
unit: string
quantity: number
unitPriceRwf: number
```

### Delivery
```
id: string
kitchenId: string
orderId: string
supplierName: string
status: DeliveryStatus
lineItems: DeliveryLineItem[]
scheduledAt?: string
completedAt?: string
notes?: string
createdAt: string
```

### DeliveryLineItem
```
id: string
orderId: string
productId: string
productName: string     — denormalized
unit: string
orderedQuantity: number
acceptedQuantity?: number
actualPrice?: PriceRecord
referencePrice?: PriceRecord
qualityAssessment?: QualityAssessment
decision?: AcceptanceDecision
discrepancyReason?: string
photoUri?: string       — local URI; backend must replace with object-storage URL
```

### PriceRecord
```
amount: number
currency: string        — 'RWF' in all mock data
source: PriceSource     — 'chef-entered' | 'reference'
referenceDate?: string  — ISO date; present only when source='reference'
```

### QualityAssessment
```
score: number           — integer 0–100
freshness: QualityResult
ripeness: QualityResult
damage: QualityResult
spoilage: QualityResult
sizeGrade: QualityResult
foreignMatter: QualityResult
notes?: string
estimatedQuantity: number | null   — null when crate not fully visible
```

### Chef (session model only)
```
id: string
phone: string
```

No `name`, `email`, or profile fields on mobile yet.

---

## 5. Enums and Status Values

All TypeScript union types that become Python `Literal` or `Enum` values:

```python
# Order status
OrderStatus = Literal['draft', 'submitted', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

# Delivery status
DeliveryStatus = Literal['pending', 'in_progress', 'completed']

# Quality result (per dimension)
QualityResult = Literal['pass', 'watch', 'fail']

# Acceptance decision
AcceptanceDecision = Literal['accepted', 'partially-accepted', 'rejected']

# Price source
PriceSource = Literal['chef-entered', 'reference']

# Stock movement reason
StockMovementReason = Literal['delivery', 'manual_adjustment', 'opening_count', 'daily_use']

# Mutation status
MutationStatus = Literal['pending', 'syncing', 'failed', 'conflict']

# Mutation operation
MutationOperation = Literal[
    'kitchen.create', 'kitchen.update', 'kitchen.archive',
    'stock.update_quantity', 'stock.update_daily_use',
    'sales.create',
    'order.submit', 'order.cancel',
    'delivery.start', 'delivery.complete', 'delivery.update_line_item',
]

# Sync phase (mobile UI)
SyncPhase = Literal['idle', 'pending', 'syncing', 'failed', 'conflict']

# Notification permission
NotificationPermissionStatus = Literal['granted', 'denied', 'undetermined']
```

---

## 6. Business Calculations in Mobile

All in `mobile/src/domain/calculations/`. These are the authoritative formulas the backend must replicate exactly.

### `calcExpectedPortions(sales: Partial<WeeklySales>): number`
```
weighted = w0*0.4 + w1*0.2 + w2*0.2 + w3*0.2
result = ceil(weighted * 1.1)   // 10% safety buffer
```
Missing weeks treated as 0.  
Safety buffer constant: `DEFAULT_SAFETY_BUFFER = 0.1` (10%).

### `calcExpectedDailyUse(weeklySales, daysOpen, quantityPerPortion, yieldPercentage=1.0): number`
```
dailySales = weeklySales / daysOpen
result = (dailySales * quantityPerPortion) / yieldPercentage
```
Throws `RangeError` if `daysOpen <= 0` or `yieldPercentage <= 0`.  
Returns 0 if `weeklySales < 0` or `quantityPerPortion < 0`.

### `calcDaysOfCover(currentStock, expectedDailyUse): number`
```
if expectedDailyUse <= 0: return Infinity
return currentStock / expectedDailyUse
```

### `isLowStock(currentStock, expectedDailyUse): boolean`
```
return calcDaysOfCover(currentStock, expectedDailyUse) < 1.0
```
Threshold constant: `LOW_STOCK_DAYS_THRESHOLD = 1.0`.

### `calcQuantityToBuy(expectedRequirement, availableStock, purchaseUnitSize=1): number`
```
net = expectedRequirement - availableStock
if net <= 0: return 0
return ceil(net / purchaseUnitSize)
```

### `isShortDelivery(orderedQuantity, acceptedQuantity): boolean`
```
if orderedQuantity <= 0: return false
shortfall = orderedQuantity - acceptedQuantity
return (shortfall / orderedQuantity) > 0.05
```
Threshold constant: `SHORT_DELIVERY_THRESHOLD = 0.05` (5%).

### `calcShortfallFraction(orderedQuantity, acceptedQuantity): number`
```
if orderedQuantity <= 0: return 0
return max(0, (orderedQuantity - acceptedQuantity) / orderedQuantity)
```

**Purchasing screen calculation (not in domain/ — inline in UI):**
```
targetStock = stockItem.dailyUseRate * TARGET_DAYS_COVER  // TARGET_DAYS_COVER = 3
qtyToBuy = calcQuantityToBuy(targetStock, stockItem.quantityOnHand)
```

---

## 7. SQLite Schema (SCHEMA_VERSION = 1)

All tables from `database.ts`. Plus `schema_version` and `app_flags` tables added by hydration code.

| Table | Primary Key | Key Columns |
|---|---|---|
| `kitchens` | `id TEXT` | `chef_id`, `name`, `address`, `cuisine_type`, `seating_capacity INTEGER`, `is_archived INTEGER`, `created_at` |
| `ingredients` | `id TEXT` | `kitchen_id`, `name`, `unit`, `category`, `sku`, `created_at` |
| `menu_items` | `id TEXT` | `kitchen_id`, `name`, `description`, `category`, `price_rwf REAL`, `is_active INTEGER`, `created_at` |
| `sales_records` | `id TEXT` | `kitchen_id`, `menu_item_id`, `menu_item_name`, `date TEXT`, `portions_sold INTEGER`, `price_rwf REAL` |
| `stock_items` | `id TEXT` | `kitchen_id`, `ingredient_id`, `ingredient_name`, `unit`, `quantity_on_hand REAL`, `daily_use_rate REAL`, `last_updated` |
| `stock_movements` | `id TEXT` | `kitchen_id`, `stock_item_id`, `ingredient_name`, `delta REAL`, `reason TEXT`, `reference_id`, `recorded_at` |
| `orders` | `id TEXT` | `kitchen_id`, `status TEXT DEFAULT 'draft'`, `total_rwf REAL`, `placed_at`, `expected_delivery_at`, `notes`, `created_at` |
| `order_line_items` | `id TEXT` | `order_id`, `product_id`, `product_name`, `unit`, `quantity REAL`, `unit_price_rwf REAL` |
| `deliveries` | `id TEXT` | `kitchen_id`, `order_id`, `supplier_name`, `status TEXT DEFAULT 'pending'`, `scheduled_at`, `completed_at`, `notes`, `created_at` |
| `delivery_line_items` | `id TEXT` | `delivery_id`, `order_id`, `product_id`, `product_name`, `unit`, `ordered_quantity REAL`, `accepted_quantity REAL`, `actual_price_amount REAL`, `actual_price_currency TEXT`, `reference_price_amount REAL`, `reference_price_currency TEXT`, `reference_price_date TEXT`, `quality_score INTEGER`, `quality_json TEXT`, `decision TEXT`, `discrepancy_reason TEXT`, `photo_uri TEXT` |
| `mutation_queue` | `id TEXT` | `kitchen_id`, `operation TEXT`, `payload TEXT` (JSON), `status TEXT DEFAULT 'pending'`, `retry_count INTEGER`, `last_error`, `created_at`, `updated_at` |
| `schema_version` | — | `version INTEGER` |
| `app_flags` | `key TEXT` | `value TEXT` |

**Missing tables** (domain models exist but no SQLite representation):
- `recipes` / `recipe_ingredients` — no table
- `catalog_products` — no table (mock only)

**Missing SQLite repository implementations:**
- Orders (`orders` + `order_line_items` — tables defined, no repo class)
- Menu items (`menu_items` — table defined, no repo class)
- Ingredients (`ingredients` — table defined, no repo class)
- Recipes (no table, no repo)

---

## 8. Offline Mutation Queue

### `QueuedMutation` shape
```typescript
{
  id: string;
  kitchenId: string;
  operation: MutationOperation;   // see §5 for all 11 values
  payload: Record<string, unknown>;
  status: MutationStatus;         // 'pending' | 'syncing' | 'failed' | 'conflict'
  retryCount: number;
  lastError?: string;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### SQLite column mapping
| TS field | SQLite column | Type |
|---|---|---|
| `id` | `id` | TEXT PK |
| `kitchenId` | `kitchen_id` | TEXT |
| `operation` | `operation` | TEXT |
| `payload` | `payload` | TEXT (JSON) |
| `status` | `status` | TEXT DEFAULT 'pending' |
| `retryCount` | `retry_count` | INTEGER |
| `lastError` | `last_error` | TEXT |
| `createdAt` | `created_at` | TEXT |
| `updatedAt` | `updated_at` | TEXT |

### Repository interface
```typescript
enqueue(mutation: Omit<QueuedMutation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>)
listPending(kitchenId?: string)
listFailed(kitchenId?: string)
markSyncing(id: string)
markFailed(id: string, error: string)
markConflict(id: string, error: string)
delete(id: string)
countPending(kitchenId: string)
```

---

## 9. Synchronization Contract

The mobile mutation queue must eventually push to a backend sync endpoint. The current mobile implementation stores mutations but never flushes them (`useSyncStatus` comment: "local-only mode — mutations are queued but never flushed to a server").

### Proposed sync envelope (derived from mobile QueuedMutation)

```json
{
  "operation_id": "uuid",
  "kitchen_id": "kitchen-1",
  "operation": "delivery.update_line_item",
  "payload": { ... },
  "client_version": 1,
  "device_id": "string",
  "created_at": "2026-11-02T10:00:00Z",
  "retry_count": 0
}
```

### Backend sync API shape

```
POST /api/v1/sync/push
Body: { mutations: SyncEnvelope[] }
Response: {
  results: [
    { operation_id, status: 'applied' | 'rejected' | 'conflict', error?: string, server_version?: number }
  ]
}

GET /api/v1/sync/pull
Query: ?since_cursor=<timestamp>&kitchen_id=<id>
Response: {
  changes: ServerChange[],
  cursor: string
}
```

### Operation-to-endpoint mapping

| MutationOperation | Backend handler |
|---|---|
| `kitchen.create` | `POST /kitchens` |
| `kitchen.update` | `PATCH /kitchens/{id}` |
| `kitchen.archive` | `POST /kitchens/{id}/archive` |
| `stock.update_quantity` | `PATCH /kitchens/{id}/inventory/{stockItemId}` |
| `stock.update_daily_use` | `PATCH /kitchens/{id}/inventory/{stockItemId}` |
| `sales.create` | `POST /kitchens/{id}/sales` |
| `order.submit` | `POST /kitchens/{id}/orders` |
| `order.cancel` | `POST /kitchens/{id}/orders/{id}/cancel` |
| `delivery.start` | `PATCH /kitchens/{id}/deliveries/{id}/status` |
| `delivery.complete` | `PATCH /kitchens/{id}/deliveries/{id}/status` |
| `delivery.update_line_item` | `PATCH /kitchens/{id}/deliveries/{id}/items/{lineItemId}` |

---

## 10. Unresolved Product Decisions

| # | Decision | Classification | Notes |
|---|---|---|---|
| 1 | Weekly sales bucketing: mobile uses `date` string as bucket key (not ISO week). Backend must define canonical weekly grouping. | **BLOCKER** | `getWeeklySales` groups by exact date, not week number. Backend weekly aggregation will differ unless aligned. |
| 2 | Safety buffer in `calcExpectedPortions` is applied to the weighted average (10%). Master prompt says "applied to expected portions or ingredient requirements" — which is it? | **ASSUMPTION** | Mobile applies to portions (weighted average × 1.1). Backend must match. |
| 3 | `Recipe.portions` represents yield as a count of portions, not a fraction. `calcExpectedDailyUse` takes a separate `yieldPercentage` float (default 1.0). No yield percentage stored in recipe model. | **BLOCKER** | Backend recipe model must add `yieldPercentage` field or clarify how yield is captured. |
| 4 | `dailyUseRate` on `StockItem` is stored pre-computed, not recalculated from sales on demand. Backend should recalculate. How to reconcile? | **ASSUMPTION** | Backend recalculates; mobile receives updated rate via sync pull. |
| 5 | Order IDs on mobile are `ord-${Date.now()}` — guaranteed unique within a session but not UUID. Backend must map or replace with stable UUIDs. | **BLOCKER** | Idempotency key strategy needed. |
| 6 | `Chef.id` on mobile is `chef-${phone}` (e.g. `chef-0788000001`). Backend JWT `sub` must map to this or mobile must update its ID format. | **BLOCKER** | `useDataHydration` hardcodes `chefId = 'chef-0788000001'`. Must be replaced with JWT claim. |
| 7 | Photo `photoUri` is a local device path. No upload flow to object storage exists in mobile. Backend receiving API accepts photos — but mobile sends only local URI currently. | **BLOCKER** | Mobile needs a pre-signed URL upload flow or multipart form upload. Receiving screen must be updated. |
| 8 | `AcceptanceDecision` uses `'partially-accepted'` (hyphen). Backend must preserve exact string value for mobile compatibility. | **ASSUMPTION** | Do not normalize to `partially_accepted` without updating mobile. |
| 9 | Restaurant approval workflow (Phase 2). Not implemented in mobile. | DEFERRED | Design extensibility into Order and Kitchen models but do not implement. |
| 10 | PDF product specifications could not be read (poppler unavailable). Any product requirements in the PDFs not reflected in the code may be missed. | **RISK** | Install poppler and re-read PDFs to verify completeness. |

---

## 11. Implementation Phase Plan

### Phase 0 — Repository inspection and integration design ✅
Deliverable: this document.

### Phase 1 — Backend foundation
- Python project with `pyproject.toml` (Poetry or uv)
- FastAPI app factory, health endpoint
- pydantic-settings config (`.env.example`)
- SQLAlchemy 2.x async engine + sessionmaker
- Alembic init + first migration skeleton
- structlog structured logging
- Global exception handler → JSON error envelope
- pytest + HTTPX test infrastructure
- Docker + docker-compose (PostgreSQL + Redis)
- Ruff + mypy/pyright config

Deliverable: `backend/` running `uvicorn app.main:app` returning `{"status": "ok"}`.

### Phase 2 — Authentication and kitchen isolation
- `chefs`, `otp_challenges`, `authentication_sessions` tables + Alembic migration
- OTP provider interface + mock provider (any 6 digits) + real SMS adapter stub
- JWT access token + refresh token
- `GET /api/v1/chefs/me`, `PATCH /api/v1/chefs/me`
- `kitchens` table + `kitchen_memberships` table
- Full kitchen CRUD endpoints
- Authorization dependency injecting `current_chef`
- Kitchen ownership check on every kitchen-scoped route
- Security tests: cross-chef access denial

Deliverable: Auth endpoints passing. Kitchen CRUD with ownership enforcement.

### Phase 3 — Ingredients, menu, and recipes
- `ingredients`, `menu_items`, `recipes`, `recipe_ingredients` tables
- CRUD endpoints for each
- Unit and yield field on recipe
- Ingredient search
- Kitchen-scoped queries throughout

Deliverable: Menu and recipe APIs matching mobile domain models.

### Phase 4 — Sales and purchasing engine
- `sales_records` table
- Sales CRUD endpoints
- Deterministic purchasing calculation module (Python, mirrors mobile formulas exactly)
- `GET /api/v1/kitchens/{id}/purchase-plan` endpoint
- Weekly aggregation with documented bucketing strategy
- Unit tests for every calculation function

Deliverable: Sales API + purchase plan endpoint with 100% unit test coverage on domain calculations.

### Phase 5 — Catalog and orders
- `food_bundles_products`, `product_price_records` tables
- Mock catalog adapter seeded with the 12 products from mobile mock
- FoodBundles catalog API interface for future live integration
- `orders` + `order_line_items` tables + full order lifecycle
- Idempotency keys on order creation
- Order status transitions + history

Deliverable: Catalog API + order lifecycle matching mobile `OrderStatus` values.

### Phase 6 — Delivery receiving and AI quality assessment
- `deliveries`, `delivery_line_items`, `delivery_photos`, `quality_assessments` tables
- Delivery lifecycle endpoints
- Object storage adapter (mock local filesystem + S3 interface)
- Pre-signed upload URL endpoint
- AI quality assessment: provider interface + mock adapter (mirrors `mockQualityAdapter` behaviour)
- Photo size validation (≤ 1 MB)
- Short delivery detection using `isShortDelivery` formula
- Chef confirmation requirement before persisting AI results

Deliverable: Receiving API end-to-end. AI assessment mock. Photo upload flow.

### Phase 7 — Inventory and stock
- `stock_items`, `stock_movements` tables
- Inventory endpoints
- `dailyUseRate` recalculation service from sales
- Stock movement recording on delivery acceptance
- Days-of-cover and low-stock API responses
- Opening/closing stock calculations

Deliverable: Inventory API. `dailyUseRate` recalculated server-side.

### Phase 8 — Offline synchronization
- `sync_operations`, `idempotency_records`, `sync_conflicts`, `device_sync_cursors` tables
- `POST /api/v1/sync/push` — process QueuedMutation batch, idempotent
- `GET /api/v1/sync/pull` — changes since cursor
- Per-operation result reporting
- Conflict detection and classification
- Mobile integration guide documenting how to replace mock repositories with HTTP-backed ones

Deliverable: Sync API. Idempotency proven by tests.

### Phase 9 — Dashboard and notifications
- `GET /api/v1/kitchens/{id}/dashboard` aggregating all signals
- Notification preferences table
- Push notification service adapter (FCM stub)
- Server-triggered low-stock and delivery-ready events

Deliverable: Dashboard endpoint. Push notification infrastructure.

### Phase 10 — Meta AI integration (Muse Spark priority)
- Meta Model API client
- Muse Spark adapter for quality assessment
- Schema-validated AI response pipeline
- SAM 3.1 segmentation adapter (evaluation)
- AI feature flags (default: disabled)
- Usage/latency/cost logging
- Full test suite: disabled, timeout, invalid response, fallback

Deliverable: Real AI quality assessment (optional, behind feature flag).

### Phase 11 — Security hardening and production readiness
- PostgreSQL Row-Level Security evaluation
- Rate limiting (OTP, API)
- Request size limits
- CORS and trusted-host configuration
- Audit logging for sensitive operations
- Rwanda data privacy compliance review
- Penetration testing checklist

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| PDFs not readable — product requirements may be incomplete | HIGH | Install poppler and re-read both PDFs before Phase 1. Add any missing requirements to this document. |
| Mobile hardcodes `chefId = 'chef-0788000001'` in `useDataHydration` | HIGH | Replace with JWT `sub` claim in hydration hook before backend integration. Coordinate mobile + backend change. |
| Order IDs are `ord-${Date.now()}` — not stable UUIDs | HIGH | Implement client-generated idempotency keys in mobile mutation queue before sync. Backend maps client IDs to server UUIDs. |
| Photo upload flow entirely absent from mobile | HIGH | Mobile receiving screen sends local `photoUri`. Must add pre-signed URL upload step. Design API contract before Phase 6 begins. |
| Weekly sales bucketing mismatch | MEDIUM | Define canonical week boundary (ISO week, Monday start) in Phase 4. Update mobile `getWeeklySales` to use ISO week number. |
| `Recipe.yieldPercentage` not modelled | MEDIUM | Add field to Recipe domain model and SQLite table in Phase 3. Currently defaults to 1.0 (no waste) everywhere. |
| `AcceptanceDecision` hyphen `partially-accepted` vs underscore | LOW | Preserve exact mobile string. Document in API schema. Never normalize without mobile PR. |
| Mutation queue never flushed — thousands of stale records possible | MEDIUM | Add flush logic in Phase 8 + periodic queue cleanup. |
| No real SMS provider — OTP always mocked | MEDIUM | Select an SMS provider (Africa's Talking, Twilio) before Phase 2 production deployment. Interface is designed for pluggability. |
| Meta AI model IDs unknown — docs reference `dev.meta.ai` URLs | LOW | Verify model identifiers from official API docs before Phase 10. Keep configurable. |

---

*Generated from mobile source inspection. PDF content not available (poppler not installed). Verify against product specifications when PDFs are readable.*
