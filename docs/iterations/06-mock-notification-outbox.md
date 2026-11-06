# Iteration 6: Mock Notification & Virtual Outbox Suite

## 1. What was built and why

The client brief stresses customer communication during order cooking, kitchen queue delays, and rider pickup handoff. Rather than relying on paid SMS or WhatsApp business gateways (which require payment methods, DLT entity registrations in India, and Meta Business approval), Iteration 6 delivers a **100% free, fully interactive Mock Notification & Virtual Outbox Suite**.

This allows reviewers, stakeholders, and clients to experience the complete notification lifecycle with zero external accounts or credentials:
- Real-time notification dispatch hooked into order checkout, kitchen stage progression, and supervisor delays.
- Dual-channel message generation: authentic Indian DLT-style SMS and rich WhatsApp conversational text with food emojis and itemized lists.
- Interactive **Virtual Device Outbox** drawer embedded on the customer tracking screen (`/orders/[id]`).
- Live updates via PostgreSQL Server-Sent Events (`LISTEN`/`NOTIFY`) without page reloads.
- One-click `wa.me` deep link allowing reviewers to preview the exact formatted message inside real WhatsApp Web/App if desired.

---

## 2. New Flows & Architectural Details

### A. Lifecycle Event Triggers
1. **`ORDER_CONFIRMED`**:
   - **Trigger**: Payment success in `processMockPayment` (`src/features/checkout/payment-service.ts`).
   - **Payload**: Order token (`#HYD-...`), outlet name, promised ready time, itemized portion summary, and live tracking link.
2. **`COOKING_STARTED`**:
   - **Trigger**: Kitchen staff advances ticket from `NEW` to `PREPARING` in `advanceKitchenStage` (`src/features/orders/kitchen-service.ts`).
   - **Payload**: Kitchen team start alert, slow dum cooking notice, promised ready timestamp.
3. **`PROMISE_EXTENDED`**:
   - **Trigger**: Kitchen supervisor applies time adjustment in `overrideOrderPromise` (`src/features/orders/kitchen-service.ts`).
   - **Payload**: Empathetic delay notice quoting supervisor's reason (e.g., *"Hand-crafted dum pot slow to seal"*, *"Station backlog"*) and new promised ready time.
4. **`READY_FOR_PICKUP`**:
   - **Trigger**: Kitchen staff advances ticket from `PREPARING` to `READY`.
   - **Payload**: Sealed dum packaging completion notice, rider collection alert, tracking link.
5. **`ORDER_HANDED_OFF`**:
   - **Trigger**: Kitchen staff confirms delivery rider collection (`READY` to `HANDED_OFF`).
   - **Payload**: Order transit notice, thank-you note, receipt link.

---

### B. Database Schema & Additive Migration
File: `prisma/migrations/20261105210000_mock_notifications/migration.sql`

```prisma
enum NotificationChannel {
  WHATSAPP
  SMS
}

enum NotificationEvent {
  ORDER_CONFIRMED
  COOKING_STARTED
  READY_FOR_PICKUP
  PROMISE_EXTENDED
  ORDER_HANDED_OFF
}

model OrderNotification {
  id               String              @id @default(cuid())
  orderId          String
  order            Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  channel          NotificationChannel
  event            NotificationEvent
  recipient        String
  title            String
  body             String
  whatsappDeepLink String?
  gatewayMessageId String
  sentAt           DateTime            @default(now())

  @@index([orderId, sentAt])
}
```

---

### C. Interactive Customer Virtual Outbox
Files:
- `src/features/notifications/components/virtual-outbox-drawer.tsx`
- `src/features/notifications/components/outbox-button.tsx`
- `src/app/api/orders/[id]/notifications/route.ts`

**Features**:
- **Outbox Pill with Live Counter**: Displayed in the order receipt header: `[📱 Mock Outbox (3)]`.
- **WhatsApp Simulator View**: Renders authentic WhatsApp chat bubbles (`#d9fdd3` background, avatar, double blue read receipts `✓✓`, bold formatting, synthetic Gateway IDs like `wamid.HB_17308234...`).
- **SMS Simulator View**: Renders cellular carrier text messages with DLT headers (`CP-COMPNY`) and character counter (`142 / 160 GSM chars`).
- **External Preview Link**: Clicking *"Preview in Real WhatsApp"* triggers `https://wa.me/?text=...`, letting anyone preview the exact formatted payload on real WhatsApp Web/App for free.
- **Share Button**: Direct WhatsApp share button in the footer for customers to send live tracking links to friends and family.

---

## 3. Verification & Quality Gates

| Gate | Command | Result |
|---|---|---|
| **TypeScript** | `npm run typecheck` | 0 errors |
| **ESLint** | `npm run lint` | 0 warnings, 0 errors |
| **Unit Tests** | `npm run test` | 9 test files, 53 tests passing (100%) |
| **Webpack Build** | `npx next build --webpack` | 21/21 routes compiled cleanly |
