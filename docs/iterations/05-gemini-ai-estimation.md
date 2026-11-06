# Iteration 05 — Gemini AI Preparation-Time Estimation, Late-Order Alerting & Manager Overrides

Date: 5 November 2026 (Asia/Kolkata)  
Repository: `restaurant-system`  
Review status: ready for review; commit history preserved.

---

## What this iteration delivers

This iteration implements the AI intelligence and operational exception workflows mandated by the Company A client brief:

- [x] Gemini AI Kitchen Prep-Time Engine using `@google/genai` (version 2.32.0):
  - Predicts honest preparation time upon successful payment based on real-time line items, portion prep overrides, add-ons, and live kitchen load (active tickets in queue and total dishes in preparation across stations).
- [x] Strict enforcement of the client brief's core promise rule:
  $$\text{promisedMinutes} = \max(\text{aiEstimateMinutes}, \text{outletMinimumPrepMinutes}) + \text{outletPackingMinutes}$$
- [x] Comprehensive, production-grade graceful fallbacks:
  - If `GEMINI_API_KEY` is not provided, or if the Gemini API call fails, encounters network errors, or exceeds a 3.5-second timeout, the system falls back seamlessly to an intelligent deterministic kitchen load buffer model without stalling checkout.
  - The order audit trail marks `estimateSource` as `"GEMINI_AI"`, `"HEURISTIC_LOAD"`, or `"GEMINI_FALLBACK"`.
- [x] Two-metre readable Kitchen Board lateness alerting:
  - Orders overdue ($> 0$ min) highlight with amber/red status badges.
  - Orders **10+ minutes late** activate a high-contrast pulsing alert: `🚨 10+ MIN LATE · MANAGER ALERT` designed specifically for cheap Android tablets in hot, loud kitchens.
- [x] Customer empathetic late order notification:
  - The live tracking receipt on `/orders/[id]` detects 10+ minute lateness and displays: *"We're taking extra care with your order. Our outlet kitchen manager has been alerted and is expediting your dishes."*
- [x] Kitchen Supervisor / Manager Promise Override:
  - Kitchen supervisors can click **"Adjust"** on any active kitchen ticket to extend the promise time (with preset buttons +5m, +10m, +15m or custom minutes) and supply an operational reason.
  - Backed by `POST /api/kitchen/orders/[id]/override-promise`.
  - Trigger `paid_order_change` automatically emits a PostgreSQL `LISTEN`/`NOTIFY` event, causing the customer's live tracking receipt to update immediately via Server-Sent Events (SSE) without a page refresh.
- [x] AI Reorder Suggestions from Customer Order History:
  - Customer ordering screen (`/order`) displays a personalized **"AI Suggested for You"** section analyzing previous order frequencies.
  - Strict compliance with client brief constraint: *"When it is wrong: suggestions never add items to the cart"*. Suggestions provide a **"Review dish"** button that opens the configurator modal for explicit user customization and basket placement.
- [x] PostgreSQL migration (`20261105180000_gemini_estimation_and_overrides`) adding `aiEstimatedMinutes`, `aiExplanation`, and `managerOverrideReason` to `Order`, and updating the `paid_order_change` trigger.
- [x] Unit test suite (`tests/unit/ai-estimation.test.ts`) verifying heuristic buffers, the $\max(\text{AI}, \text{minimum})$ promise invariant, and fallback resilience.

---

## Design and architecture changes: What and Why

### 1. Honest promise vs. static config
* **What**: Upgraded the provisional promise calculation in `payment-service.ts` to evaluate real-time kitchen queue depth and query Gemini AI.
* **Why**: The client brief states: *"predicts prep time from current kitchen load, so the promised time is honest... the promised time is the higher of the AI estimate and the outlet's minimum"*. A static promise causes customer dissatisfaction on Friday/Sunday dinner peaks (1,200 orders/hr across outlets), whereas an AI estimate accounts for active kitchen backlog while never undercutting the outlet's physical minimum preparation time.

### 2. Fast timeout & non-blocking fallback
* **What**: Enforced an `AbortController` 3.5-second timeout on `@google/genai` API requests, coupled with an automated deterministic fallback (`calculateHeuristicPrep`).
* **Why**: The brief requires checkout in under 60 seconds. A payment or checkout flow must never hang or crash if the external AI service suffers latency or network partitions. When Gemini is unavailable, the deterministic queue delay model $(\min(25, \text{activeTickets} \times 3\text{m}))$ steps in instantly.

### 3. Manager override and real-time SSE propagation
* **What**: Created `POST /api/kitchen/orders/[id]/override-promise` and updated the PostgreSQL trigger on `Order` to include `promisedReadyAt` and `estimateSource`.
* **Why**: If a hand-crafted dum pot is slow to release or an unexpected ingredient restocking delay occurs, the kitchen supervisor must be able to adjust the delivery promise. The PostgreSQL `pg_notify` trigger propagates this change over SSE directly to the customer's phone in real time.

### 4. Non-intrusive AI reorder suggestions
* **What**: Introduced `ReorderSuggestions` on `/order` and endpoint `GET /api/customer/reorder-suggestions`.
* **Why**: In the brief: *"AI suggests reorders from each customer's history... When it is wrong: suggestions never add items to the cart"*. The UI displays appetizing personalized recommendations with a "Review dish" CTA, ensuring the customer retains full control over portions and add-ons.

---

## Detailed New Flows

### Flow 1: Gemini AI Prep-Time Prediction on Checkout
```text
[Customer completes mock UPI/Card payment]
                │
                ▼
POST /api/orders/[id]/mock-payment
                │
                ├─ 1. Verifies quote fingerprint and outlet opening hours
                ├─ 2. Fetches live kitchen load:
                │     - Active ticket count (NEW + PREPARING)
                │     - Total items currently on line
                │     - Active order numbers
                │
                ├─ 3. Calls predictKitchenPrepTime():
                │     - Queries Gemini 2.5 Flash via @google/genai (with 3.5s timeout)
                │     - Prompt includes order items, base prep times, outlet minimum, and active queue
                │     - Returns { estimatedMinutes, explanation, confidence }
                │     - Fallback: calculateHeuristicPrep() if Gemini unconfigured or timed out
                │
                ├─ 4. Applies Brief Invariant:
                │     promisedMinutes = max(aiEstimatedMinutes, outlet.minimumPrepMinutes) + outlet.packingMinutes
                │
                ├─ 5. Updates Order record:
                │     - status = "NEW"
                │     - paymentStatus = "PAID"
                │     - promisedReadyAt = now + promisedMinutes
                │     - estimateSource = "GEMINI_AI" | "HEURISTIC_LOAD"
                │     - aiEstimatedMinutes, aiExplanation
                │
                ▼
PostgreSQL trigger fires notify_paid_order_change()
                │
                ├─> Kitchen Board (/kitchen) receives live SSE change & displays ticket
                └─> Customer Tracking (/orders/[id]) displays countdown with AI explanation
```

### Flow 2: 10+ Minute Late Alert & Supervisor Override
```text
[Order on Kitchen Board approaches and passes promisedReadyAt]
                │
                ├─ remaining < 0m: Card highlights in amber ("Late by 3m")
                │
                ├─ remaining <= -10m:
                │     ┌─────────────────────────────────────────────────────┐
                │     │ Kitchen Board:                                      │
                │     │ - Displays pulsing banner:                          │
                │     │   🚨 10+ MIN LATE · MANAGER ALERT                   │
                │     │ - Thick red border (readable from 2 metres)         │
                │     ├─────────────────────────────────────────────────────┤
                │     │ Customer Tracking (/orders/[id]):                   │
                │     │ - Displays alert banner:                            │
                │     │   "We're taking extra care with your order. Outlet  │
                │     │    kitchen manager alerted and expediting."         │
                │     └─────────────────────────────────────────────────────┘
                │
[Supervisor clicks "Adjust" on Kitchen Ticket]
                │
                ▼
[OverridePromiseModal]
                │ ─ Select +5m, +10m, +15m or custom minutes
                │ ─ Enter Reason (e.g. "Dum batch release delay")
                │
                ▼
POST /api/kitchen/orders/[id]/override-promise
                │
                ├─ Updates promisedReadyAt = now + extraMinutes
                ├─ Sets estimateSource = "MANAGER_OVERRIDE"
                ├─ Records managerOverrideReason
                │
                ▼
PostgreSQL trigger notifies 'restaurant_order_change'
                │
                ├─> Kitchen Board clears late alert and updates timer
                └─> Customer receipt updates live: "Updated by kitchen supervisor: [reason]"
```

### Flow 3: AI Reorder Suggestions from Past History
```text
[Customer navigates to /order]
                │
                ▼
GET /api/customer/reorder-suggestions?outletId=[id]
                │
                ├─ 1. Queries customer's previous paid orders
                ├─ 2. Ranks dishes by frequency (e.g. Chicken dum biryani, Double ka meetha)
                ├─ 3. Matches against currently active & in-stock items at selected outlet
                ├─ 4. Generates appetizing 1-sentence prompt via Gemini
                │
                ▼
[ReorderSuggestions component rendered]
                │ ─ Shows favourite dishes with past order counts
                │ ─ Displays AI personalized note
                │ ─ Button: "Review dish" (opens configurator modal)
                │   * Strict rule: Never adds directly to cart *
```

---

## Data Model and Migration

Migration: `20261105180000_gemini_estimation_and_overrides`

### Schema Additions on `Order`
```prisma
model Order {
  ...
  aiEstimatedMinutes    Int?
  aiExplanation         String?
  managerOverrideReason String?
  ...
}
```

### Updated Trigger
```sql
DROP TRIGGER IF EXISTS paid_order_change ON "Order";

CREATE TRIGGER paid_order_change
AFTER UPDATE OF status, "paymentStatus", "promisedReadyAt", "estimateSource" ON "Order"
FOR EACH ROW
WHEN (
  NEW."paymentStatus" = 'PAID'
  AND (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD."paymentStatus" IS DISTINCT FROM NEW."paymentStatus"
    OR OLD."promisedReadyAt" IS DISTINCT FROM NEW."promisedReadyAt"
    OR OLD."estimateSource" IS DISTINCT FROM NEW."estimateSource"
  )
)
EXECUTE FUNCTION notify_paid_order_change();
```

---

## Screens and Endpoints Available

| Surface / Route | Method | Access | Behavior |
| --- | --- | --- | --- |
| `/orders/[id]` | Page | `CUSTOMER` | Live receipt with countdown, AI estimate explanation, and 10+ min late notice. |
| `/kitchen` | Page | `KITCHEN_STAFF`, `CENTRAL_ADMIN` | Kitchen board with two-metre readable layout, 10+ min late manager alert, and promise override modal. |
| `/order` | Page | `CUSTOMER` | Menu catalog with "AI Suggested for You" section based on order history. |
| `POST /api/kitchen/orders/[id]/override-promise` | `POST` | `KITCHEN_STAFF`, `CENTRAL_ADMIN` | Extends promised ready time with mandatory reason and emits live notification. |
| `GET /api/customer/reorder-suggestions` | `GET` | `CUSTOMER` | Returns personalized dishes from order history without touching cart. |

---

## Verification & Quality Gates

1. `npx prisma generate`: Regenerated Prisma client to include `aiEstimatedMinutes`, `aiExplanation`, and `managerOverrideReason`.
2. `npm run typecheck`: Passed with 0 TypeScript errors.
3. `npm run lint`: Passed with 0 errors and 0 warnings.
4. `npm run test`: All 8 Vitest test suites (48 tests) passed.
