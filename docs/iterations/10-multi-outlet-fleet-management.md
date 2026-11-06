# Iteration 10: Multi-Outlet Fleet & Cloud Kitchen Management CMS (`/admin/outlets`)

## Objective
Provide central leadership and regional managers with an authoritative fleet management dashboard (`/admin/outlets`) to manage all 14 flagship dine-in outlets and 3 cloud kitchens across Hyderabad. Support provisioning new outlets, calibrating delivery radiuses, enforcing Indian FSSAI 14-digit licence compliance, configuring kitchen prep floors and operating hours, and toggling real-time order acceptance.

## Key Features Implemented

### 1. Data Validation & Indian FSSAI Compliance (`src/features/outlets/validation.ts`)
- `createOutletSchema`: Validates name, unique slug generation, city, full address, GPS latitude/longitude, delivery radius (0.5 to 50 km), operating time windows (`opensAtMinute < closesAtMinute`), minimum kitchen prep floors, and packaging buffers.
- Enforces strict 14-digit FSSAI food safety licence validation regex (`/^\d{14}$/`) per statutory guidelines.
- `updateOutletSchema`: Supports safe partial updates for operational tuning without resetting unchanged parameters.

### 2. Multi-Outlet Admin Service (`src/features/outlets/admin-service.ts`)
- `listAllOutletsWithStats`: Retrieves all outlets across the chain paired with active order counts, lifetime order volume, and active menu dish counts.
- `createOutlet`: Provisions new outlets in a single database transaction, automatically generating default `OutletAvailability` entries for all existing menu items so newly created outlets can start serving immediately.
- `updateOutlet`: Updates parameters including service radiuses, active acceptance, and kitchen prep floors.
- `deleteOutlet`: Prevents deletion of any outlet that has active orders in preparation, prompting operators to pause the outlet safely instead.

### 3. API Endpoints (`src/app/api/admin/outlets/route.ts`, `src/app/api/admin/outlets/[id]/route.ts`)
- `GET /api/admin/outlets`: Returns all outlets with operational metrics (restricted to `CENTRAL_ADMIN`).
- `POST /api/admin/outlets`: Validates and provisions new outlets with CSRF origin verification.
- `PATCH /api/admin/outlets/[id]`: Updates outlet attributes or toggles operational availability.
- `DELETE /api/admin/outlets/[id]`: Safely deletes an outlet with zero active in-flight tickets.

### 4. Admin Fleet Management Interface (`src/app/admin/outlets/page.tsx`, `src/features/outlets/components/admin-outlets-board.tsx`)
- **Fleet KPI Ribbon**: Displays real-time metrics for Total Fleet, Dine-in Outlets, Cloud Kitchens, and Paused Outlets.
- **Filter Tags & Instant Search**: Filter by `All`, `Dine-in`, `Cloud Kitchens`, `Active Only`, `Paused`, with instant search across name, address, FSSAI, and city.
- **Interactive Outlet Cards**: Shows outlet type badge, FSSAI licence badge, delivery radius, preparation floor, live tickets in prep, and one-tap status toggling (`Accepting Orders` vs `Paused`).
- **Modals**:
  - `CreateOutletModal`: Accessible native modal to provision new locations with GPS coordinates and prep floors.
  - `EditOutletModal`: Instant in-place adjustments of radius, operating hours, and active status.
- **Navigation Integration**: Added "Outlets" with `Store` icon to `WorkspaceNav` for `CENTRAL_ADMIN`.

## Verification
- Unit test suite: `tests/unit/outlets-cms.test.ts` (6/6 tests passing).
- Full test run: 70/70 tests passing across 12 test suites.
- Typecheck: 0 errors (`tsc --noEmit`).
- Lint: 0 errors/warnings (`eslint .`).
