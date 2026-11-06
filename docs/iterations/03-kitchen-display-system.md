# Iteration 03: Real-Time Kitchen Display System (KDS) & Live Order Tracking

## Objective
Build the real-time Kitchen Display System (`/kitchen`) for outlet managers and kitchen staff, alongside live Server-Sent Events (SSE) customer order tracking (`/orders/[id]`), replacing printed paper tickets with a 2-metre readable tablet interface and zero-polling PostgreSQL `LISTEN`/`NOTIFY` event broadcasting.

## Key Features Implemented

### 1. Real-Time Event Architecture (`src/lib/realtime.ts`)
- Implemented a singleton PostgreSQL `LISTEN`/`NOTIFY` subscriber on channel `order_events` with an in-memory `EventEmitter` fan-out (`publishOrderUpdate`, `subscribeToOrderUpdates`).
- Built SSE endpoints for customer order tracking (`src/app/api/orders/[id]/events/route.ts`) and outlet kitchen boards (`src/app/api/kitchen/events/route.ts`) with automatic 20-second keep-alive heartbeats.

### 2. Kitchen Display Board (`src/app/kitchen/page.tsx`, `src/features/orders/components/kitchen-board.tsx`)
- **3-Stage Kanban Workflow**: Organizes active outlet tickets into `New`, `Preparing`, and `Ready for Pickup` columns with strict monotonic status transitions (`NEW` -> `PREPARING` -> `READY_FOR_PICKUP` -> `HANDED_OFF`).
- **2-Metre Readability & Hot/Noisy Kitchen Ergonomics**: High-contrast typography, station badges (`Biryani Dum`, `Tandoor & Haleem`, `Meetha & Drinks`, `Main Kitchen`), elapsed timers, and large touch-friendly action buttons designed for inexpensive Android tablets.
- **Late & Critical SLA Highlighting**: Tickets past their `promisedReadyAt` timestamp turn amber (`Late by Xm`), and tickets `10+ minutes` overdue trigger a high-visibility crimson alert banner (`10+ MIN LATE — ALERT MANAGER`) for both the kitchen supervisor and customer.
- **Supervisor Promise Override (`src/app/api/kitchen/orders/[id]/override-promise/route.ts`)**: Allows outlet managers and kitchen staff to extend the promised prep time (`15–240` minutes) when unexpected kitchen load occurs, immediately broadcasting the updated promise to the customer via SSE.
- **Real-Time Outlet Stock Control (`src/features/orders/components/kitchen-stock-control.tsx`, `src/app/api/kitchen/stock/pause/route.ts`)**: One-tap drawer allowing kitchen staff to pause or resume dishes at their outlet when ingredients run out.

### 3. Live Customer Order Status (`src/app/(customer)/orders/[id]/page.tsx`)
- Live SSE subscription updates the customer's countdown timer, 4-stage visual progress bar, and empathetic delay notice in real time without page refreshes.
