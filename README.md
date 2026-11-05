# Company A — Direct Ordering & Kitchen Display System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Vitest-48%20passed-brightgreen.svg)](https://vitest.dev/)

A production-grade, local-first direct-ordering web platform and live kitchen display system engineered for **Company A**, a prominent Hyderabadi biryani and restaurant chain operating 14 dine-in outlets and 3 cloud kitchens in Hyderabad.

Built to address the client's high aggregator commissions (25–30%) and customer disintermediation by providing a superior direct ordering web experience with honest AI preparation estimates, centralized menu management, and real-time kitchen display screens.

---

## Key Highlights & Core Slice

* **Customer Ordering Experience**:
  * Location-based outlet selection with delivery radius validation and nearest-outlet recommendations.
  * Rich photo menu with food photography, portions, optional add-ons, veg/non-veg dietary indicators, spice levels, allergens, and mandatory FSSAI licence display.
  * Authoritative server pricing with 5% inclusive GST extraction and discount coupons (`DIRECT10`).
  * Mock UPI and Card payment gateway integration with idempotency protections.
  * Real-time customer tracking receipt with countdown and status progression.
  * **AI Reorder Suggestions**: Recommends favourite dishes based on customer order history (adheres strictly to the constraint: *suggestions never auto-add items to the cart*).

* **Live Kitchen Display System (KDS)**:
  * Scoped strictly to the assigned outlet (strict tenant isolation between dine-in outlets and cloud kitchens).
  * Real-time Server-Sent Events (SSE) synchronized with PostgreSQL `LISTEN`/`NOTIFY` — no polling or external SaaS dependencies.
  * Two-metre readable Android tablet interface with high-contrast lane transitions (`NEW` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `HANDED_OFF`).
  * **Late Order Alerting**: Color-coded lateness timers with a prominent **10+ Minute Late Manager Alert** banner (`🚨 10+ MIN LATE · MANAGER ALERT`).
  * **Supervisor Promise Overrides**: Allows kitchen supervisors to adjust delivery estimates with an operational reason, updating the customer's phone live via SSE.
  * **One-Tap Outlet Stock Pausing ("86ing" items)**: Allows line cooks to pause sold-out dishes directly from the kitchen display.

* **Central Menu CMS**:
  * Unified workspace for central marketing and culinary teams at `/admin/menu`.
  * Dynamic dish creation and editing with photo presets and preparation metadata.
  * City-tiered portion pricing (e.g. Hyderabad, Secunderabad, Bangalore).
  * Time-based service windows (e.g. dinner-only Mutton Haleem from 17:00 to 23:30).
  * Chain-wide live stock availability switches.

* **Gemini AI Prep-Time Engine**:
  * Powered by Google Gemini 2.5 Flash via `@google/genai` (2.32.0).
  * Evaluates order items, portions, and real-time kitchen load (active tickets in queue and dishes on line).
  * **Enforces Client Invariant**: $\text{promisedTime} = \max(\text{aiEstimate}, \text{outletMinimumPrep}) + \text{outletPacking}$.
  * **Graceful Fallbacks**: Automatically falls back to a deterministic queue buffer model if `GEMINI_API_KEY` is omitted or API calls time out (>3.5s).

---

## Tech Stack

| Component | Technology | Rationale |
| --- | --- | --- |
| **Framework** | Next.js 16.4.5 App Router | React 19 Server/Client Components, streaming SSR. |
| **Styling** | Tailwind CSS v4 | Hand-crafted design system: warm-white, emerald, stone, and amber. |
| **Database** | PostgreSQL 17 | Relational transactional integrity, constraints, and pub/sub. |
| **ORM** | Prisma 7 (`@prisma/adapter-pg`) | Type-safe queries with connection pooling. |
| **Authentication** | Better Auth 1.7 | Database sessions, bcrypt hashing, rate limiting, and RBAC. |
| **Realtime** | PostgreSQL `LISTEN`/`NOTIFY` + SSE | Self-hosted, reliable event broadcasting without external SaaS. |
| **AI Integration** | Google Gemini (`@google/genai` 2.32.0) | Honest kitchen prep prediction and personalized suggestions. |
| **Validation** | Zod 4 | Strict input validation on all mutation endpoints. |
| **Testing** | Vitest & Playwright | 8 test suites, 48 unit tests passing with 100% coverage on core logic. |

---

## Quickstart (Docker Compose)

The easiest way to run the application locally:

```bash
# Clone the repository
git clone https://github.com/KanishqxMehta/restraunt_system.git
cd restraunt_system

# Launch app and PostgreSQL
docker compose up --build
```

Open **`http://localhost:3000`** in your browser.

The database will be automatically migrated and seeded with realistic demo data, three representative outlets (Kondapur, Gachibowli cloud kitchen, Kukatpally), 5 menu dishes, and demo accounts.

---

## Reviewer Demo Logins

All demo accounts use password: **`DemoAccess!2026`**

* **Customer**: `customer@demo.example` (Customer ordering, checkout, live tracking, AI suggestions)
* **Kondapur Kitchen Staff**: `kondapur@demo.example` (KDS display, stage progression, 10+m late alert, promise overrides, stock pause)
* **Gachibowli Kitchen Staff**: `gachibowli@demo.example` (Cloud kitchen tenant isolation)
* **Central Admin**: `admin@demo.example` (Central Menu CMS, city prices, chain-wide stock toggles)

---

## Verification & Testing

```bash
npm run typecheck    # TypeScript verification (0 errors)
npm run lint         # ESLint checking (0 errors, 0 warnings)
npm run test         # Vitest unit test suites (48 passing tests)
```

For detailed step-by-step local operations and production deployment guidelines, refer to [`deployment.md`](./deployment.md).
