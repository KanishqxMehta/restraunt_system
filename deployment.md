# Deployment & Local Operations Guide

This guide describes how to run and deploy the Company A direct-ordering and kitchen-display application locally using Docker Compose or native Node.js/PostgreSQL, and details deployment architecture, environment variables, and demo credentials.

---

## 1. Quickstart with Docker Compose (Recommended)

Docker Compose provides a single-command local development and evaluation environment. It automatically builds the multi-stage container, provisions PostgreSQL 17, applies all migrations, seeds synthetic realistic demo data, and spins up the Next.js application.

### Prerequisites
* Docker 24+ and Docker Compose v2+
* Ports `3000` (web app) and `5432` (PostgreSQL, bound only to `127.0.0.1`) available

### Step-by-Step Run
1. **Clone the repository and enter directory**:
   ```bash
   git clone https://github.com/KanishqxMehta/restraunt_system.git
   cd restraunt_system
   ```

2. **Start the containers**:
   ```bash
   docker compose up --build
   ```

3. **Automatic Startup Sequence**:
   The container entrypoint (`scripts/docker-entrypoint.sh`) will:
   * Generate and persist a cryptographic signing secret in the Docker volume `auth_runtime` if none is supplied.
   * Apply all Prisma migrations (`npm run db:deploy`).
   * Seed realistic Hyderabadi chain outlets, menu dishes, city pricing, and demo accounts when `ENABLE_DEMO_DATA=true` (preset in `compose.yaml`).
   * Start Next.js development server on `http://0.0.0.0:3000`.

4. **Access the application**:
   * Open your browser at: **`http://localhost:3000`**
   * Sign in using any of the reviewer demo credentials listed in Section 4 below.

5. **Stopping the environment**:
   ```bash
   docker compose down
   # To also wipe the local database volume and start fresh:
   docker compose down -v
   ```

---

## 2. Native Local Development (Without Docker)

If running directly on macOS / Linux:

### Prerequisites
* Node.js 22 LTS or newer
* PostgreSQL 17 running on `localhost:5432`
* npm 10+

### Steps
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure local environment variables**:
   ```bash
   cp .env.example .env
   ```
   Generate a Better Auth secret:
   ```bash
   node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))'
   ```
   Add the generated key to `BETTER_AUTH_SECRET` in `.env`. Set `ENABLE_DEMO_DATA=true`.

3. **Deploy database migrations & seed demo data**:
   ```bash
   npm run db:deploy
   npm run db:seed
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

5. **Run test suites**:
   ```bash
   npm run typecheck    # TypeScript compiler check (0 errors)
   npm run lint         # ESLint check (0 warnings/errors)
   npm run test         # Vitest unit test suites (79 tests passing across 14 test suites)
   ```

---

## 3. Production Deployment Architecture & Environment Variables

### Production Hosting Architecture
* **Web Tier**: Can be deployed as a containerized Node.js service (e.g. AWS ECS / Fargate, Google Cloud Run, Railway, or DigitalOcean App Platform) or deployed to Vercel.
* **Database**: Managed PostgreSQL 17 instance (AWS RDS, Supabase, Neon, or GCP Cloud SQL) with connection pooling (`pgbouncer`).
* **Realtime Events**: The architecture uses PostgreSQL `LISTEN` / `NOTIFY` and Server-Sent Events (SSE). It requires a stateful Node.js server with a persistent connection pool rather than short-lived serverless function execution.
* **AI Engine**: Connects to Google Gemini API via `@google/genai` (model: `gemini-2.5-flash`).

### Environment Variables Catalog (Names Only)
Per submission rules, only variable names are listed; secrets must never be committed:

| Variable Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string including credentials and database name. |
| `BETTER_AUTH_URL` | **Yes** | Authoritative public URL used for origin checks, session cookies, and CORS. |
| `BETTER_AUTH_SECRET` | **Yes** | Minimum 32-character high-entropy secret used for cryptographic token signing and session authentication. |
| `ENABLE_DEMO_DATA` | Optional | Set to `"true"` ONLY in development environments to seed demo accounts and historical sample orders. Must be `"false"` or omitted in production. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for real-time kitchen preparation-time estimation and personalized customer reorder suggestions. If omitted or timing out, the system automatically uses an intelligent deterministic queue load fallback. |
| `GEMINI_MODEL` | Optional | Target Gemini model identifier (defaults to `gemini-2.5-flash`). |

---

## 4. Demo Login Details for the Reviewer

All synthetic demo accounts share a standard local development password:  
**Password**: `DemoAccess!2026`

| Role | Email | Assigned Outlet / Access | Key Flows to Review |
| --- | --- | --- | --- |
| **Customer (Primary)** | `customer@demo.example` | Public / Customer ordering | Browse menu with photos, portions, add-ons, 5% inclusive GST; apply coupon `DIRECT10`; redeem **Royal Rewards Loyalty Points**; complete mock UPI/Card payment; live order tracking with countdown and lateness notices; AI reorder suggestions; **Virtual Outbox** drawer for simulated SMS and WhatsApp receipts; **Party Catering** wizard at `/party-orders` with 15–500 guest slider and automatic 5kg/10kg/20kg dum handi allocation; **Loyalty Wallet** at `/account`. |
| **Customer (Secondary)** | `customer2@demo.example` | Public / Customer ordering | Clean customer account for testing fresh registration, location picker, zero-history states, and party catering bookings. |
| **Kitchen Staff** | `kondapur@demo.example` | **Kondapur Outlet** (`outlet-kondapur`) | Outlet kitchen display with live SSE updates; New → Preparing → Ready → Handoff stages; 2-metre readable status; 10+ min late manager alert banner; "Adjust promise" supervisor override; "Outlet Stock" one-tap item pausing; **Catering Manager Review & Confirmation** for event bookings; prominent **🎉 Bulk Catering** badges with guest counts and event delivery slots. |
| **Kitchen Staff** | `gachibowli@demo.example` | **Gachibowli Cloud Kitchen** (`outlet-gachibowli`) | Demonstrates strict tenant isolation (cannot read or mutate Kondapur tickets or stock). |
| **Central Admin** | `admin@demo.example` | **Central Chain-wide** | **Executive Commission Savings & Operations Analytics** at `/admin/dashboard`: real-time tracker for the ₹1.14 Cr recovery target, 15% direct commission savings ticker, 30% catering margin captured, DPDP customer database metrics, kitchen SLA % and multi-outlet leaderboard; Authoritative **Central Menu CMS** at `/admin/menu`: add new dishes, manage city-tiered pricing, toggle stock availability across all outlets, and set time-based service windows; **Fleet Management CMS** at `/admin/outlets`: view and manage all 14 dine-in outlets and 3 cloud kitchens, provision new locations, and set FSSAI licence numbers and delivery radiuses. |
