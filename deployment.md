# Deployment & Local Operations Guide

This guide describes how to run and deploy the **Company A Direct Ordering & Real-Time Kitchen Display System** locally using Docker Compose or native Node.js/PostgreSQL, and details production deployment architecture, required environment variables (with detailed descriptions), and complete account credentials for both **Demo Mode (`ENABLE_DEMO_DATA=true`)** and **Non-Demo / Real Mode (`ENABLE_DEMO_DATA=false`)**.

* **GitHub Repository**: [https://github.com/KanishqxMehta/restraunt_system.git](https://github.com/KanishqxMehta/restraunt_system.git)

> **Important Evaluation Note (Recommended Setup)**:  
> **Initialization via Docker Compose in Demo Mode (`ENABLE_DEMO_DATA=true`) is strongly recommended** for evaluating this project. Running via Docker ensures an identical containerized environment with PostgreSQL 17 and Node.js 22 LTS, and running in Demo Mode provides instant access to pre-seeded Hyderabadi menus, outlets, interactive role-switching, sample historical orders, and the floating **Demo Testing Lab** without manual database configuration.

---

## 1. Quickstart with Docker Compose (Recommended Setup)

Docker Compose provides a single-command local development and evaluation environment. It automatically builds the multi-stage container, provisions PostgreSQL 17, applies all database migrations, seeds realistic data (17 Hyderabad outlets, 25+ menu dishes, city prices, promotional coupons, and accounts), and launches the Next.js application.

> **Why Docker + Demo Mode is Recommended**:
> 1. **Zero Configuration**: No need to install or configure local PostgreSQL 17, run manual migration commands, or generate cryptographic secrets.
> 2. **Preset Defaults**: Docker Compose comes pre-configured with `ENABLE_DEMO_DATA=true`, instantly unlocking the 1-click **Demo Account Picker** on `/login`, the top **Demo Role Switcher**, and the floating **Demo Testing Lab**.
> 3. **Isolation**: Isolates PostgreSQL data in dedicated Docker volumes (`postgres_data`, `auth_runtime`) so your host environment stays completely clean.

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
   * Seed all 14 dine-in outlets and 3 cloud kitchens across Hyderabad, 25+ authentic menu dishes across 6 categories, city pricing, and accounts according to the `ENABLE_DEMO_DATA` setting (`true` by default in `compose.yaml`).
   * Start the Next.js server on `http://0.0.0.0:3000`.

5. **Access the application**:
   * Open your browser at: **`http://localhost:3000`**
   * Sign in using the credentials listed in **Section 4 (Demo Mode)** or **Section 5 (Non-Demo Mode)** below.
   * In Demo Mode, you can also use the one-click **Demo Account Picker** on `/login` and the header **Demo Role Switcher**.

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
   Add the generated value to `BETTER_AUTH_SECRET` in `.env`. Set `ENABLE_DEMO_DATA=true` for Demo Mode or `ENABLE_DEMO_DATA=false` for Non-Demo Mode. Optionally add your `GEMINI_API_KEY`.

3. **Deploy database migrations & seed data**:
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
   npm run typecheck    # TypeScript compiler check (0 errors)
   npm run lint         # ESLint verification (0 warnings, 0 errors)
   npm run test         # Vitest unit test suites (110 tests passing across 17 test suites)
   npm run test:e2e     # Playwright end-to-end browser test suite
   ```

---

## 3. Production Deployment Architecture & Environment Variables

### Production Hosting Architecture
* **Web & Application Tier**: Deployed as a containerized Node.js 22 service (AWS ECS / Fargate, Google Cloud Run, Railway, Render, or DigitalOcean App Platform).
* **Database Tier**: Managed PostgreSQL 17 instance (AWS RDS, Supabase, Neon, or GCP Cloud SQL) with ACID transactions and strict check constraints.
* **Real-Time Event Transport**: Uses native PostgreSQL `LISTEN` / `NOTIFY` (`pg_notify` on channel `restaurant_order_change`) paired with HTTP/2 Server-Sent Events (SSE). Because it maintains a persistent database listener connection, a stateful container runtime (such as Railway, Render, Fly.io, or Cloud Run with min-instances) is recommended over ephemeral serverless lambdas.
* **AI Engine**: Connects to Google Gemini via `@google/genai` (`gemini-3.5-flash-lite` with automatic multi-model fallback to `gemini-3.1-flash-lite`, `gemini-3.5-flash`, and `gemini-2.5-flash`). Enforces a strict 3.5-second `AbortController` timeout and falls back deterministically to the station queue model if the API is unreachable or unconfigured.

### Environment Variables Catalog & Detailed Descriptions

Below is the complete list of environment variables used by the application, their requirement level, and their exact operational purpose:

| Variable Name | Required | Default / Example | Detailed Description & Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** | `postgresql://isocode:isocode_local@localhost:5432/isocode` | PostgreSQL 17 connection string. Used by Prisma ORM for relational queries, atomic transactions, and by the dedicated background subscriber running `LISTEN restaurant_order_change` for real-time KDS broadcasts. |
| `BETTER_AUTH_URL` | **Yes** | `http://localhost:3000` | The canonical, authoritative public base URL of the running application. Used by Better Auth for HTTP Origin verification, CORS policy checks, session cookie scoping, and CSRF protection on mutation endpoints. |
| `BETTER_AUTH_SECRET` | **Yes** | `(min 32-character base64url string)` | High-entropy cryptographic secret key. Used by Better Auth to sign, verify, and encrypt session tokens, auth cookies, and password verification hashes. Must be kept secret. |
| `ENABLE_DEMO_DATA` | Optional | `true` in development, `false` in production | **Demo Mode Flag**. When set to `"true"`, enables public synthetic demo accounts, the 1-click **Demo Account Picker** on `/login`, the header **Demo Role Switcher**, and the floating **Demo Testing Lab** interactive drawer. When set to `"false"` (or omitted), disables all demo switcher bars, hides sample account shortcuts, enforces strict standard authentication, and operates in clean Non-Demo Mode. |
| `GEMINI_API_KEY` | Optional | `(empty by default)` | Google Gemini API key. Enables live culinary expediter reasoning for kitchen preparation time estimation (`predictKitchenPrepTime`) and personalized customer reorder suggestion notes. If omitted, expired, or timing out, the system automatically and gracefully falls back to the deterministic station-queue model (`HEURISTIC_LOAD` / `GEMINI_FALLBACK`) with zero downtime. |
| `GEMINI_MODEL` | Optional | `gemini-3.5-flash-lite` | Target Gemini model identifier. Defaults to `gemini-3.5-flash-lite` with built-in resilient cascading fallbacks across `gemini-3.1-flash-lite`, `gemini-3.5-flash`, and `gemini-2.5-flash`. |
| `NEXT_TELEMETRY_DISABLED` | Optional | `1` | Set to `"1"` in containerized environments to disable anonymous Next.js build and runtime diagnostic telemetry. |

---

## 4. Demo Mode Credentials (`ENABLE_DEMO_DATA=true`)

When `ENABLE_DEMO_DATA=true` is set, the application runs in **Evaluation & Demo Mode**. All synthetic accounts share a standard local development password:  
**Password**: `DemoAccess!2026`

In this mode, reviewers can either log in manually with the email and password, or use the 1-click **Demo Account Picker** on `/login` and the **Demo Role Switcher** in the top navigation bar.

| Role | Email | Kitchen PIN | Assigned Outlet / Scope | Key Flows to Review in Demo Mode |
| --- | --- | --- | --- | --- |
| **Customer (Primary)** | `customer@demo.example` | — | Public Customer Ordering | Browse 25+ dishes across 6 categories with food photography, portions, add-ons, and 5% inclusive GST; discover & apply coupons (`DIRECT10`); earn and redeem **Royal Rewards Loyalty Points**; complete mock UPI/Card payment; live order tracking with countdown and 10+ min late alerts; AI/history reorder suggestions (never auto-added to cart); **Virtual Outbox** drawer for simulated SMS & WhatsApp updates; **Party Catering** wizard at `/party-orders` (15–500 guests, automatic 5kg/10kg/20kg dum handi allocation); **Loyalty Wallet** at `/account`. |
| **Customer (Secondary)** | `customer2@demo.example` | — | Public Customer Ordering | Secondary customer account for testing order isolation, zero-history states, fresh cart states, and cross-customer access guards. |
| **Customer (Tertiary)** | `customer3@demo.example` | — | Public Customer Ordering | Third customer account for testing multi-user party catering bookings, address management, and promotional coupon usage limits. |
| **Kitchen Staff (Dine-in)** | `kondapur@demo.example` | `7821` | **Kondapur Outlet** (`outlet-kondapur`) | Two-metre readable KDS board at `/kitchen` with live SSE updates (`NEW` → `PREPARING` → `READY` → `HANDED_OFF`); Gemini AI / Queue Model prep badges; `🚨 10+ MIN LATE · MANAGER ALERT` banner; "Adjust promise" supervisor override (+5m/+10m/+15m); one-tap "Outlet Stock" 86ing drawer; **Catering Manager Review & Confirmation** lock gate for bulk party orders. |
| **Kitchen Staff (Cloud Kitchen)** | `gachibowli@demo.example` | `8342` | **Gachibowli Cloud Kitchen** (`outlet-gachibowli`) | Demonstrates strict multi-tenant outlet isolation (can only view and mutate Gachibowli orders and stock; returns HTTP 403 when trying to access other outlets). |
| **Central Admin** | `admin@demo.example` | — | **Central Chain-Wide (All 17 Outlets)** | **Executive Analytics** (`/admin/dashboard`): real-time ₹1.14 Cr annual savings tracker, 15% commission savings, 30% catering margin, DPDP consent metrics, kitchen SLA %, cancellation risk alerts, and 17-outlet leaderboard; **Central Menu CMS** (`/admin/menu`): create/edit dishes, city-tiered pricing, time windows, and chain-wide stock; **Promotions & Coupons Portal** (`/admin/coupons`) + live **Royal Rewards Loyalty Rules** configurator; **Fleet Management CMS** (`/admin/outlets`): manage all 14 dine-in & 3 cloud kitchens, FSSAI validation, delivery radiuses, and staff credentials; **Chain-Wide KDS Switcher** (`/kitchen`). |

> **Interactive Demo Testing Lab**: Look for the floating **Demo Testing Lab** button in the bottom-right corner of the screen. It adapts to your active role (`Customer`, `Kitchen Staff`, or `Central Admin`) and lets you seed carts, adjust loyalty balances, place instant live-tracked orders, simulate kitchen rushes, force 15-minute overdue SLA breaches, inject 60–120 guest catering banquets, inject 50 historical orders for analytics charts, or reset the entire demo environment in one click.

---

## 5. Non-Demo / Real Mode Credentials (`ENABLE_DEMO_DATA=false`)

When `ENABLE_DEMO_DATA=false` is set (or omitted), the application runs in **Clean Production / Non-Demo Mode**. In this mode:
* The demo account picker and top role switcher are completely hidden and disabled.
* Demo simulation APIs (`/api/demo`) reject all requests with `HTTP 403 Forbidden`.
* Public customer registration on `/login` creates standard customers (role `CUSTOMER`) with affirmative DPDP Act 2023 marketing consent toggles.
* Below are the dedicated, non-demo administrative and staff accounts pre-configured for evaluation of the production workflow, covering **2 Customers**, **2 Kitchens (1 Dine-in + 1 Cloud Kitchen)**, and the **Central Admin**:

**Standard Production Password**: `CompanyA!Secure2026`

| Role | Account Name | Email | Assigned Outlet / Access | Description & Verification Workflow |
| --- | --- | --- | --- | --- |
| **Customer 1 (Real)** | Rahul Sharma | `rahul.sharma@companya-orders.in` | Public Customer Storefront | Real customer account. Used to test genuine consumer sign-up/sign-in, delivery address selection across Hyderabad, menu browsing, cart checkout with 5% inclusive GST, coupon code redemption (`DIRECT10`), Mock UPI/Card payment, real-time order tracking, and Royal Rewards point accrual. |
| **Customer 2 (Real)** | Priya Reddy | `priya.reddy@companya-orders.in` | Public Customer Storefront | Second real customer account. Used to verify customer data isolation (Priya cannot see Rahul's orders or tracking receipts), test parallel checkouts, and submit 15–500 guest bulk party catering bookings at `/party-orders`. |
| **Kitchen Staff 1 (Dine-in)** | Kondapur Head Chef | `chef.kondapur@companya-kitchens.in` | **Kondapur Outlet** (`outlet-kondapur`) | Dedicated kitchen display login for the Kondapur flagship dine-in location. Staff sees live incoming tickets on the 2-metre readable KDS, advances orders from `NEW` to `PREPARING` to `READY`, uses supervisor promise overrides, pauses out-of-stock items ("86"), and reviews bulk catering bookings. |
| **Kitchen Staff 2 (Cloud Kitchen)** | Gachibowli Expediter | `expediter.gachibowli@companya-kitchens.in` | **Gachibowli Cloud Kitchen** (`outlet-gachibowli`) | Dedicated kitchen display login for the Gachibowli cloud kitchen. Proves strict multi-tenant isolation: Gachibowli staff can only access Gachibowli tickets and cannot view or alter Kondapur orders. |
| **Central Admin** | Operations Director | `ops.director@companya.in` | **Chain-Wide Central Hub (All 17 Outlets)** | Central administrative account. Full access to the Central Menu CMS (`/admin/menu`), Promotions & Loyalty Configurator (`/admin/coupons`), 17-Outlet Fleet & FSSAI Administration (`/admin/outlets`), Executive Margin & Operations Dashboard (`/admin/dashboard`), and the chain-wide KDS monitor (`/kitchen`). |

### How to Seed Non-Demo Accounts
To seed the database with clean catalog dishes, outlets, city prices, and these production accounts without sample demo orders or demo toolbar scripts:
```bash
ENABLE_DEMO_DATA=false npm run db:seed
```
Or sign up directly as a customer on the `/login` page using any valid email address and password.
