# Iteration 7: Direct Party & Bulk Catering Orders

## 1. What was built and why

In the client brief, Company A highlighted a major financial leak:
> *"The phone line loses 30 bulk orders a month at ₹18,000 and 30% margin: 30 × ₹5,400 × 12 = ₹19.44 lakh. Total ₹1.14 crore a year. The ask: ... and party orders should be easy to place."*

Previously, customers had to call a busy restaurant phone line, resulting in abandoned calls, unrecorded dietary requirements, and lost high-margin catering revenue.

Iteration 7 delivers an end-to-end **Party & Bulk Catering Direct Ordering Wizard (`/party-orders`)**:
- Direct headcount-based configurator (15 to 500 guests).
- Automatic sealed dum handi allocation (5kg, 10kg, 20kg clay earthen pots).
- Dietary split calculator (Veg vs Non-Veg percentage).
- Recipe and package tier selection (Chicken, Mutton, Mixed Biryani; Royal Daawat vs Nizami Feast).
- Advanced event date and serving time scheduling with minimum 4-hour lead time validation.
- Direct kitchen routing: tickets arrive on the kitchen display (`/kitchen`) flagged with a royal plum `🎉 Bulk Catering` badge, headcount, and event slot.
- Live order tracking and simulated customer notifications.

---

## 2. New Flows & Architectural Details

### A. Headcount & Handi Calculator
File: `src/features/catering/calculator.ts`

- **Allocation Logic**:
  - 1 kg of authentic dum biryani serves ~2.5 to 3 guests with accompanying salan and raita.
  - Dynamically packages orders into:
    - `20 kg Royal Handi` (serves 50 guests)
    - `10 kg Feast Handi` (serves 25 guests)
    - `5 kg Daawat Handi` (serves 12–15 guests)
- **Complimentary Accompaniments**:
  - Mirchi Ka Salan (earthen pot)
  - Burani Dahi Raita
  - Shahi Double Ka Meetha
  - Live dough handi seals and serving platters
  - (Nizami Feast tier adds Shahi Mutton Haleem / Paneer Tikka & Rose Gulab Jamuns)
- **Bulk Celebration Discounts**:
  - 5% discount automatically applied for 50+ guests.
  - 8% discount automatically applied for 100+ guests.
- **Tax Compliance**:
  - 5% inclusive GST formula strictly preserved: `tax = total - total / 1.05`.

---

### B. Database Schema & Additive Migration
File: `prisma/migrations/20261105230000_party_catering_orders/migration.sql`

```prisma
model Order {
  // Existing fields...
  isCatering          Boolean   @default(false)
  guestCount          Int?
  eventDate           DateTime?
  specialInstructions String?

  @@index([isCatering, status])
}
```

---

### C. Customer Party Catering Wizard
File: `src/features/catering/components/party-catering-experience.tsx`
Route: `/party-orders` (linked from customer navigation bar)

- **Step 1**: Interactive guest slider (15 to 500) and dietary split percentage (Veg vs Non-Veg).
- **Step 2**: Biryani recipe selection (Chicken, Mutton, Both) and package tier toggle (Royal Daawat vs Nizami Feast).
- **Step 3**: Event date/time picker (enforcing >= 4 hours lead time), outlet selector, venue delivery address, and special catering instructions.
- **Live Sidebar**: Real-time breakdown of calculated handis, complimentary accompaniments, bulk discounts, and 5% GST total.

---

### D. Kitchen Display & Tracking Integration
- **Kitchen Board (`/kitchen`)**:
  - Catering tickets feature a prominent `🎉 Bulk Catering · {guestCount} Guests · Slot: {time}` banner.
  - Displays customer event instructions (e.g. *"Deliver by 12:45 PM for 1:00 PM lunch"*).
- **Customer Tracking (`/orders/[id]`)**:
  - Displays party catering confirmation banner with guest count, instructions, and sealed dum handi badge.
  - Customer mock outbox logs catering confirmation and delivery updates.

---

## 3. Verification & Quality Gates

| Gate | Command | Result |
|---|---|---|
| **TypeScript** | `npm run typecheck` | 0 errors |
| **ESLint** | `npm run lint` | 0 warnings, 0 errors |
| **Unit Tests** | `npm run test` | 10 test files, 58 tests passing (100%) |
| **Webpack Build** | `npx next build --webpack` | 23/23 routes compiled successfully |
