# Iteration 8: Executive Commission Savings & Operations Analytics Dashboard

## 1. What was built and why

In the Company A client brief, two strategic stakeholders were identified alongside store-level staff:
> *"Users: Customers (mobile), outlet managers and kitchen staff, and the central marketing team. The founder-CEO signs the deal."*
> 
> *"The problem: Assumptions: app sales are 55% of ₹96 crore = ₹52.8 crore at 27% average commission. Moving 12% of that to direct orders, where delivery and payment costs are 12%, saves 15 points on ₹6.336 crore = ₹95.04 lakh. The phone line loses 30 bulk orders a month at ₹18,000 and 30% margin: 30 × ₹5,400 × 12 = ₹19.44 lakh. Total ₹1.14 crore a year."*

Previously, the central administration view only provided menu editing (`/admin/menu`). The Founder-CEO and Central Marketing Team lacked visibility into whether the platform was actually delivering on the **₹1.14 Crore annual margin recovery** thesis.

Iteration 8 delivers the **Executive Commission Savings & Operations Analytics Dashboard (`/admin/dashboard`)**:
- **Live Strategic Objective Counter**: Real-time progress bar toward the ₹1.1448 Crore annual savings benchmark.
- **Direct Channel Savings Metric (15% Net Margin)**: Tracks cumulative 15% net savings on direct online orders vs the 27% aggregator commission baseline.
- **Bulk Catering Margin Metric (30% Gross Margin)**: Tracks captured catering profits recovering phone-line order drop-offs.
- **DPDP Act 2023 Customer Relationship Ownership**: Displays first-party customer accounts and affirmative marketing consent rates—data previously withheld by Swiggy/Zomato.
- **Kitchen SLA Compliance & Operations**: Chain-wide on-time fulfillment rate, average kitchen prep times, and $>10$ minute critical delay alerts.
- **Outlet & Cloud Kitchen Leaderboard**: Comparative ranking of all Hyderabad locations (dine-in vs cloud kitchens) with volume, revenue, commission saved, catering bookings, and SLA compliance.
- **Central Navigation Suite**: First-class navigation links in the header allowing leadership to seamlessly switch between **Dashboard** (`/admin/dashboard`), **Menu & Stock** (`/admin/menu`), and **Kitchen KDS** (`/kitchen`).

---

## 2. Mathematical Model & Calculation Logic

File: `src/features/analytics/calculator.ts`

| Metric | Source Formula | Client Brief Benchmark |
|---|---|---|
| **Direct Commission Savings** | $\text{Direct GMV} \times 15\%$ | Saves 15 points on direct volume ($27\% \text{ commission} - 12\% \text{ direct cost}$) = **₹95.04 Lakh/yr** |
| **Bulk Catering Margin** | $\text{Catering GMV} \times 30\%$ | Captures 30 orders/mo @ ₹18,000 & 30% margin = **₹19.44 Lakh/yr** |
| **Total Value Captured** | $\text{Direct Savings} + \text{Catering Margin}$ | **₹1.1448 Crore/yr** ($₹95.04\text{L} + ₹19.44\text{L}$) |
| **Target Progress %** | $(\text{Captured Value} / ₹1,14,48,000) \times 100$ | Visualized on executive progress bar |
| **DPDP Marketing Opt-in %** | $(\text{Opted-in Customers} / \text{Total Customers}) \times 100$ | Customer ownership reclaimed from aggregators |
| **Kitchen On-Time SLA %** | $(\text{On-time Orders} / \text{Completed Orders}) \times 100$ | Orders ready on or before `promisedReadyAt` |

---

## 3. Architecture & Security Controls

1. **Role Authorization**:
   - Both `/admin/dashboard` and underlying analytics functions strictly require `viewer.role === "CENTRAL_ADMIN"`.
   - Unauthorized users or customers are redirected away via `requirePageViewer(["CENTRAL_ADMIN"])`.
2. **Database Performance**:
   - Efficient parallel querying via Prisma: customers, outlets, and orders are aggregated server-side in a single round-trip without client waterfalls.
3. **Design System Harmony**:
   - Built with the elevated palette: Primary Cardamom Green (`#133d34`), Warm Cream canvas (`#faf8f5`), and Regal Plum accents (`#3b1747`).
   - Interactive modal detailing the complete financial model and assumptions for the Founder-CEO.

---

## 4. Verification & Quality Gates

| Check | Tool / Command | Result |
|---|---|---|
| **Unit Tests** | `vitest run tests/unit/analytics.test.ts` | 6/6 tests passing |
| **Full Test Suite** | `npm run test` | 64/64 tests passing across 11 suites (100%) |
| **Type Checking** | `npm run typecheck` | 0 errors |
| **Linting** | `npm run lint` | 0 errors, 0 warnings |
| **Production Build** | `npx next build --webpack` | 25/25 routes compiled and prerendered |
