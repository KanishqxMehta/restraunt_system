# Iteration 04 — Central Menu CMS, City Pricing and Outlet Stock Controls

Date: 5 November 2026 (Asia/Kolkata)  
Repository: `restaurant-system`  
Starting commit: `541609b` — `Live kitchen display and customer tracking`  
Review status: ready for review; commit history preserved.

---

## What this iteration delivers

This iteration transforms the read-only preview `/admin/menu` into an authoritative, fully interactive Central Menu CMS, fulfills the client brief's requirement that items pause when an outlet marks them out of stock, and introduces time-based menus (e.g. dinner-only Hyderabadi specialties).

- [x] Authoritative central menu workspace for `CENTRAL_ADMIN` on `/admin/menu` with live stats, search, category pills, dietary filters, and status filters.
- [x] Complete dish creation modal (`CreateDishModal`) with photo gallery presets, dietary marks (Veg / Non-veg), spice levels (0–3), allergens, base preparation times, prep station routing, and batch capacity.
- [x] Dish detail editing modal (`EditDishModal`) supporting comprehensive attribute updates.
- [x] City-tiered portion pricing modal (`EditPricesModal`) allowing dynamic price adjustment in ₹ (stored in integer paise) with automatic 5% inclusive GST handling.
- [x] New portion definition form allowing central teams to expand portions (e.g. "Family pack", "Jumbo pack") per dish.
- [x] Real-time per-outlet stock pausing controls ("Items pause when an outlet marks them out of stock"):
  - Central Admin can toggle stock availability for *any* outlet directly on dish cards.
  - Kitchen Staff on `/kitchen` can access the "Outlet Stock" control panel to pause/resume dishes specifically for their assigned outlet without opening the full admin console.
- [x] Time-based menu windows (`availableFromMinute` to `availableToMinute`):
  - Items can be scheduled for specific operating hours (e.g., Mutton Haleem active only between 17:00 and 23:30).
  - Time window logic correctly evaluates in `Asia/Kolkata` time, supporting overnight service windows across midnight.
- [x] Customer-facing ordering safeguards:
  - Sold-out or paused items display a "Sold out" badge on `/order` and disable configuration buttons.
  - Items outside their service hours display "⏰ Available HH:MM – HH:MM" and disable adding to basket.
  - Authoritative checkout quote calculation (`priceLines`) rejects paused or time-restricted items with HTTP 409 conflict.
- [x] Additive PostgreSQL migration (`20261105120000_central_menu_cms`) adding `availableFromMinute` and `availableToMinute` with SQL range check constraints.
- [x] Unit test suite (`tests/unit/menu-cms.test.ts`) covering Zod validation, time window arithmetic, overnight boundaries, and quote rejection.

---

## Design and architecture changes: What and Why

### 1. Centralized authoritative catalog vs. Outlet operational autonomy
* **What**: The central marketing and culinary team owns the definition of menu dishes, descriptions, photography, standard recipes, allergens, and city prices. Outlets do not create dishes or alter base prices. However, outlets possess operational authority over **stock availability** (pausing items when raw materials run out).
* **Why**: The client brief specifies: *"I pay the apps a quarter of every order and they own my customers. I want our own ordering site that is faster and nicer than the apps, with one menu and prices I control. Orders should go straight to the right outlet's kitchen screen... items pause when an outlet marks them out of stock."* Central control prevents menu fragmentation across 14 outlets and 3 cloud kitchens, while local stock pausing prevents kitchen bottlenecks and broken promise times.

### 2. Time-based service windows
* **What**: Added `availableFromMinute` and `availableToMinute` integer offsets (0 to 1440) on `MenuItem`.
* **Why**: In Hyderabadi culinary traditions, certain signature dishes (such as slow-simmered Haleem or specialized late-night biryanis) are prepared and served exclusively during dinner or evening cycles. Rather than manually pausing and resuming dishes daily, central admin can define authoritative operating windows.

### 3. City-tiered pricing structure
* **What**: `CityPrice` models portion prices per city (e.g. Hyderabad, Secunderabad, Bangalore).
* **Why**: The chain operates across multiple metropolitan tiers with varying ingredient procurement, kitchen overhead, and commercial real estate costs. City prices allow setting differential prices per city while maintaining identical menu items and allergen profiles. All prices are entered and displayed inclusive of 5% GST.

### 4. Direct Kitchen Stock Pausing ("86ing" items)
* **What**: Introduced `KitchenStockControl` directly into `/kitchen` and wired `POST /api/kitchen/stock/pause`.
* **Why**: Kitchen staff operate on Android tablets in hot, loud kitchens during peak rushes (up to 1,200 orders/hr). Staff do not have admin permissions to browse the central CMS. Giving them a dedicated, one-tap "Outlet Stock" modal on the kitchen board enables instant stock pausing before an order is placed.

---

## Detailed New Flows

### Flow 1: Central Admin Dish Creation & Editing
```text
[Central Admin]
      │
      ▼
[/admin/menu] ──> Click "+ Add menu dish"
      │
      ▼
[CreateDishModal]
      │ ─ Enter Dish Name, Category, Description
      │ ─ Select Veg / Non-Veg badge & Spice level (0–3)
      │ ─ Check Allergens (Milk, Gluten, Sesame, etc.)
      │ ─ Input Base Prep (min), Station (BIRYANI/MAIN), Batch Capacity
      │ ─ Optionally set Time Window (e.g. 17:00 to 23:30)
      │ ─ Choose Photo Preset or custom path
      │ ─ Define initial Portion ("Regular") & City Price ("Hyderabad", ₹350)
      │
      ▼
POST /api/admin/menu
      │ ─ Validates against createMenuItemSchema
      │ ─ Transactionally creates MenuItem, MenuPortion, CityPrice
      │ ─ Auto-populates OutletAvailability for all active outlets (default: in-stock)
      ▼
UI updates optimistically with new dish card
```

### Flow 2: City Pricing & Portion Expansion
```text
[/admin/menu] ──> Click "City prices" on a Dish Card
      │
      ▼
[EditPricesModal]
      │ ─ View current portions (Regular, Family pack, etc.)
      │ ─ Edit prices per city (e.g. Hyderabad: ₹350, Mumbai: ₹380)
      │ ─ Or add new portion with name and city price
      │
      ▼
PUT /api/admin/menu/[id]/prices  or  POST /api/admin/menu/[id]/prices
      │ ─ Validates non-negative integer paise
      │ ─ Upserts CityPrice records
      ▼
Reflects instantly across customer catalog for outlets in that city
```

### Flow 3: Live Outlet Stock Pausing
```text
[Option A: Central Admin on /admin/menu]       [Option B: Kitchen Staff on /kitchen]
                 │                                            │
                 ▼                                            ▼
Toggle outlet switch on Dish Card             Click "Outlet Stock" button in header
                 │                                            │
                 └──────────────┬─────────────────────────────┘
                                │
                                ▼
                 POST /api/admin/menu/[id]/availability
                 or POST /api/kitchen/stock/pause
                                │
                                ├─ Checks viewer role & outlet membership
                                ├─ Upserts OutletAvailability { isAvailable: false }
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │ Immediate Customer Impact:                   │
         │ 1. /order: Badge changes to "Sold out"       │
         │ 2. "Add +" button disabled                   │
         │ 3. If in cart, checkout quote returns 409:   │
         │    "An item is unavailable or out of stock"  │
         └──────────────────────────────────────────────┘
```

### Flow 4: Time-Based Service Window Enforcement
```text
[Customer visits /order]
      │
      ▼
getCustomerMenu(outletId)
      │ ─ Checks Outlet opening hours (opensAtMinute to closesAtMinute)
      │ ─ Checks each item's service window (availableFromMinute to availableToMinute)
      │   using Kolkata minute time
      │
      ├─ If inside window: item is available, "Add +" enabled
      │
      └─ If outside window:
            ─ Card displays "⏰ Available 17:00 – 23:30"
            ─ Button disabled with "Outside hours"
            ─ If quote requested via API outside hours, priceLines throws 409:
              "An item is unavailable outside its designated service hours."
```

---

## Data Model and Migration

Migration: `20261105120000_central_menu_cms`

### Schema additions
```prisma
model MenuItem {
  ...
  availableFromMinute Int?
  availableToMinute   Int?
  ...
}
```

### Generated SQL
```sql
ALTER TABLE "MenuItem" ADD COLUMN "availableFromMinute" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN "availableToMinute" INTEGER;

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_availableFromMinute_check"
  CHECK ("availableFromMinute" IS NULL OR ("availableFromMinute" >= 0 AND "availableFromMinute" <= 1440));
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_availableToMinute_check"
  CHECK ("availableToMinute" IS NULL OR ("availableToMinute" >= 0 AND "availableToMinute" <= 1440));
```

Historical order snapshots (`OrderItem`) remain unchanged and immutable: past orders preserve their snapped portion names, allergens, and unit prices even if a menu dish is edited or deactivated.

---

## Security, Consistency and Failure Handling

1. **Role-Based Access Control**:
   * `CENTRAL_ADMIN` is authorized to create dishes, edit descriptions, adjust city prices, and toggle stock across all chain outlets.
   * `KITCHEN_STAFF` can only toggle stock for their assigned outlet ID(s); requests for unassigned outlets return HTTP 403.
   * `CUSTOMER` cannot access administrative endpoints or alter pricing; customer requests to admin routes return HTTP 401 or 403.
2. **Safe Soft Deactivation**:
   * Menu dishes cannot be hard-deleted from the database if referenced in historical orders. The CMS provides `isActive: false` soft-deactivation via `PATCH /api/admin/menu/[id]`, hiding the dish from customer browsing while preserving historical auditability.
3. **Optimistic UI with Rollback**:
   * Stock pause toggles update local state immediately for responsive tablet UX. If the server transaction or network fails, state rolls back to previous availability and displays an error alert.
4. **Authoritative Server Pricing**:
   * The client cart never dictates price or tax. Quoting recomputes totals using active `CityPrice` and verifies both outlet availability and time-of-day windows.

---

## Screens and Endpoints Available

| Surface / Route | Method | Access | Behavior |
| --- | --- | --- | --- |
| `/admin/menu` | Page | `CENTRAL_ADMIN` | Central menu workspace with stats, filters, creation modal, and per-outlet stock switches. |
| `/kitchen` | Page | `KITCHEN_STAFF`, `CENTRAL_ADMIN` | Kitchen board with added "Outlet Stock" modal for fast item pausing. |
| `/api/admin/menu` | `GET` | `CENTRAL_ADMIN` | Returns `{ items, outlets }` for the central catalog. |
| `/api/admin/menu` | `POST` | `CENTRAL_ADMIN` | Creates new menu item with initial portions, city prices, and outlet availabilities. |
| `/api/admin/menu/[id]` | `GET` | `CENTRAL_ADMIN` | Returns specific menu item with portions and pricing. |
| `/api/admin/menu/[id]` | `PUT` | `CENTRAL_ADMIN` | Updates dish attributes, allergens, prep times, and service hours. |
| `/api/admin/menu/[id]` | `PATCH` | `CENTRAL_ADMIN` | Toggles dish active status (`isActive`). |
| `/api/admin/menu/[id]` | `DELETE` | `CENTRAL_ADMIN` | Soft-deactivates dish. |
| `/api/admin/menu/[id]/availability` | `POST` | `CENTRAL_ADMIN`, `KITCHEN_STAFF` (scoped) | Toggles stock availability for a specific outlet. |
| `/api/admin/menu/[id]/prices` | `PUT` | `CENTRAL_ADMIN` | Updates city prices for an existing portion. |
| `/api/admin/menu/[id]/prices` | `POST` | `CENTRAL_ADMIN` | Adds a new portion with city prices. |
| `/api/kitchen/stock/pause` | `POST` | `KITCHEN_STAFF`, `CENTRAL_ADMIN` | Outlet stock pausing endpoint used by kitchen tablet UI. |

---

## Commands Run and Verification

1. `npx prisma generate`: Regenerated Prisma client to include `availableFromMinute` and `availableToMinute`.
2. `npm run typecheck`: `tsc --noEmit` executed with 0 type errors.
3. `npm run lint`: `eslint .` passed with 0 errors and 0 warnings.
4. `npm run test`: All 7 Vitest test suites (43 tests) passed.
