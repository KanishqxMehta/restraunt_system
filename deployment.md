# Deployment & Local Operations Guide

This guide describes how to run and deploy the **Company A Direct Ordering & Real-Time Kitchen Display System** locally using Docker Compose or native Node.js/PostgreSQL, and details production deployment architecture, required environment variables (names only), and reviewer demo credentials.

* **GitHub Repository**: [https://github.com/KanishqxMehta/restraunt_system.git](https://github.com/KanishqxMehta/restraunt_system.git)

---

## 1. Quickstart with Docker Compose (Recommended)

Docker Compose provides a single-command local development and evaluation environment. It automatically builds the multi-stage container, provisions PostgreSQL 17, applies all database migrations, seeds realistic synthetic demo data (17 Hyderabad outlets, 25+ menu dishes, city prices, promotional coupons, and demo accounts), and launches the Next.js application.

### Prerequisites
* Docker 24+ and Docker Compose v2+
* Ports `3000` (web application) and `5432` (PostgreSQL, bound strictly to `127.0.0.1`) available

### Step-by-Step Run
1. **Clone the repository and enter directory**:
   ```bash
   git clone https://github.com/KanishqxMehta/restraunt_system.git
   cd restraunt_system
   ```

2. **(Optional) Supply a Gemini API Key**:
   Export `GEMINI_API_KEY` in your shell or add it to a local `.env` file if you want live Google Gemini AI calls (`estimateSource: "GEMINI_AI"`). If omitted, the application automatically runs using its deterministic station-queue fallback model (`HEURISTIC_LOAD` / `GEMINI_FALLBACK`).

3. **Start the containers**:
   ```bash
   docker compose up --build
   ```

4. **Automatic Startup Sequence**:
   The container entrypoint (`scripts/docker-entrypoint.sh`) will automatically:
   * Generate and persist a cryptographic signing secret in the Docker volume `auth_runtime` if none is supplied.
   * Apply all Prisma migrations (`npm run db:deploy`).
   * Seed all 14 dine-in outlets and 3 cloud kitchens across Hyderabad, 25+ authentic menu dishes across 6 categories, city pricing, and demo accounts when `ENABLE_DEMO_DATA=true` (default in `compose.yaml`).
   * Start the Next.js server on `http://0.0.0.0:3000`.

5. **Access the application**:
   * Open your browser at: **`http://localhost:3000`**
   * Sign in using any of the reviewer demo credentials listed in **Section 4** below, or use the one-click **Demo Account Picker** on `/login` and the header **Demo Role Switcher**.

6. **Stopping the environment**:
   ```bash
   docker compose down
   # To also wipe the local database volume and start fresh:
   docker compose down -v
   ```

---

## 2. Native Local Development (Without Docker)

If running directly on macOS or Linux without Docker:

### Prerequisites
* Node.js 22 LTS or newer
* PostgreSQL 17 running on `localhost:5432`
* npm 10+

### Step-by-Step Run
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure local environment variables**:
   ```bash
   cp .env.example .env
   ```
   Generate a Better Auth cryptographic signing secret:
   ```bash
   node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))'
   ```
   Add the generated value to `BETTER_AUTH_SECRET` in `.env`, and set `ENABLE_DEMO_DATA=true`. Optionally add your `GEMINI_API_KEY`.

3. **Deploy database migrations & seed demo data**:
   ```bash
   npm run db:deploy
   npm run db:seed
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:3000`**.

5. **Run verification & test suites**:
   ```bash
   npm run typecheck          # TypeScript compiler check (0 errors)
   npm run lint               # ESLint verification (0 warnings, 0 errors)
   npm run test               # Vitest unit test suites (110 tests passing across 17 test suites)
   npm run test:e2e           # Playwright end-to-end browser test suite
   npm run build:submission   # Regenerate TDD (.pdf & .docx) and submission ZIP bundle
   ```

---

## 3. Production Deployment Architecture & Environment Variables

### Production Hosting Architecture
* **Web & Application Tier**: Deployed as a containerized Node.js 22 service (AWS ECS / Fargate, Google Cloud Run, Railway, Render, or DigitalOcean App Platform).
* **Database Tier**: Managed PostgreSQL 17 instance (AWS RDS, Supabase, Neon, or GCP Cloud SQL) with ACID transactions and strict check constraints.
* **Real-Time Event Transport**: Uses native PostgreSQL `LISTEN` / `NOTIFY` (`pg_notify` on channel `restaurant_order_change`) paired with HTTP/2 Server-Sent Events (SSE). Because it maintains a persistent database listener connection, a stateful container runtime (such as Railway, Render, Fly.io, or Cloud Run with min-instances) is recommended over ephemeral serverless lambdas.
* **AI Engine**: Connects to Google Gemini via `@google/genai` (`gemini-3.5-flash-lite` with automatic multi-model fallback to `gemini-3.1-flash-lite`, `gemini-3.5-flash`, and `gemini-2.5-flash`). Enforces a strict 3.5-second `AbortController` timeout and falls back deterministically to the station queue model if the API is unreachable or unconfigured.

### Environment Variables Catalog (Names Only)
Per submission security rules, **only environment variable names** are listed below; secret values are never committed to the repository:

| Variable Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | PostgreSQL 17 connection string for application queries, transactions, and the `LISTEN`/`NOTIFY` subscriber. |
| `BETTER_AUTH_URL` | **Yes** | Canonical public base URL (e.g., `http://localhost:3000` or production HTTPS domain) used for origin validation, session cookies, and CSRF protection. |
| `BETTER_AUTH_SECRET` | **Yes** | High-entropy secret (minimum 32 characters) used by Better Auth to sign and verify session tokens and cookies. |
| `ENABLE_DEMO_DATA` | Optional | Set to `"true"` in local evaluation/demo environments to enable demo account seeding, the role switcher, and the interactive **Demo Testing Lab**. Must be `"false"` or omitted in production. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key used for live kitchen prep-time prediction and personalized reorder notes. When omitted or unreachable, the app transparently switches to its deterministic queue-load heuristic (`HEURISTIC_LOAD` / `GEMINI_FALLBACK`). |
| `GEMINI_MODEL` | Optional | Preferred Gemini model identifier (defaults to `gemini-3.5-flash-lite` with automatic fallback across `gemini-3.1-flash-lite`, `gemini-3.5-flash`, and `gemini-2.5-flash`). |
| `NEXT_TELEMETRY_DISABLED` | Optional | Set to `"1"` in container builds to disable Next.js anonymous telemetry. |

---

## 4. Demo Login Details for the Reviewer

All synthetic demo accounts share a single local evaluation password:
* **Password**: `DemoAccess!2026`

Reviewers can also switch between these personas in one click using the **Demo Role Switcher** in the top navigation bar or the **Demo Account Picker** on `/login` (with optional 4-digit Kitchen tablet PINs).

| Role | Email | Kitchen PIN | Assigned Outlet / Scope | Key Flows to Review |
| --- | --- | --- | --- | --- |
| **Customer (Primary)** | `customer@demo.example` | — | Public / Customer Ordering | Browse 25+ dishes across 6 categories with food photography, portions, add-ons, and 5% inclusive GST; discover & apply coupons (`DIRECT10`); earn and redeem **Royal Rewards Loyalty Points**; complete mock UPI/Card payment; live order tracking with countdown and 10+ min late alerts; AI/history reorder suggestions (never auto-added to cart); **Virtual Outbox** drawer for simulated SMS & WhatsApp updates; **Party Catering** wizard at `/party-orders` (15–500 guests, automatic 5kg/10kg/20kg dum handi allocation); **Loyalty Wallet** at `/account`. |
| **Customer (Secondary)** | `customer2@demo.example` | — | Public / Customer Ordering | Secondary customer account for testing order isolation, fresh cart states, and cross-customer access guards. |
| **Customer (Tertiary)** | `customer3@demo.example` | — | Public / Customer Ordering | Third customer account for testing multi-user party catering bookings and promotional coupon limits. |
| **Kitchen Staff (Dine-in)** | `kondapur@demo.example` | `7821` | **Kondapur Outlet** (`outlet-kondapur`) | Two-metre readable KDS board at `/kitchen` with live SSE updates (`NEW` → `PREPARING` → `READY` → `HANDED_OFF`); Gemini AI / Queue Model prep badges; `🚨 10+ MIN LATE · MANAGER ALERT` banner; "Adjust promise" supervisor override (+5m/+10m/+15m); one-tap "Outlet Stock" 86ing drawer; **Catering Manager Review & Confirmation** lock gate for bulk party orders. |
| **Kitchen Staff (Cloud Kitchen)** | `gachibowli@demo.example` | `8342` | **Gachibowli Cloud Kitchen** (`outlet-gachibowli`) | Demonstrates strict multi-tenant outlet isolation (can only view and mutate Gachibowli orders and stock; HTTP 403 on other outlets). |
| **All 17 Fleet Kitchens** | `<outlet-slug>@demo.example` | Auto-generated (viewable in `/admin/outlets`) | Any of the 14 dine-in outlets or 3 cloud kitchens | Provisioned automatically during seed. Central Admin can view or rotate any outlet's staff login and 4-digit PIN from `/admin/outlets` ("Staff Login & PIN"). |
| **Central Admin** | `admin@demo.example` | — | **Central Chain-Wide (All 17 Outlets)** | **Executive Analytics** (`/admin/dashboard`): real-time ₹1.14 Cr annual savings tracker, 15% commission savings, 30% catering margin, DPDP consent metrics, kitchen SLA %, cancellation risk alerts, and 17-outlet leaderboard; **Central Menu CMS** (`/admin/menu`): create/edit dishes, city-tiered pricing, time windows, and chain-wide stock; **Promotions & Coupons Portal** (`/admin/coupons`) + live **Royal Rewards Loyalty Rules** configurator; **Fleet Management CMS** (`/admin/outlets`): manage all 14 dine-in & 3 cloud kitchens, FSSAI validation, delivery radiuses, and staff credentials; **Chain-Wide KDS Switcher** (`/kitchen`). |

> **Tip for Reviewers — Interactive Demo Testing Lab**: Look for the floating **Demo Testing Lab** button in the bottom-right corner of the screen. It adapts to your active role (`Customer`, `Kitchen Staff`, or `Central Admin`) and lets you seed carts, adjust loyalty balances, place instant live-tracked orders, simulate kitchen rushes, force 15-minute overdue SLA breaches, inject 60–120 guest catering banquets, inject 50 historical orders for analytics charts, or reset the entire demo environment in one click.
