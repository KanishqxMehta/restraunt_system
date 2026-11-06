# Iteration 01 — Database, authentication and access control

Date: 4 November 2026 (Asia/Kolkata)  
Repository: `restaurant-system`  
Starting commit: `771dcf8` — `chore: initialize project and Docker setup`  
Review status: ready for review; no commit or push performed by Codex.

## Goal and delivered behavior

Establish a persistent, self-contained foundation before building customer checkout. Authentication is real and database-backed; the role workspaces are explicitly read-only previews.

- [x] Rename the npm package to match `restaurant-system`.
- [x] Add a Prisma migration, PostgreSQL adapter and shared connection pool.
- [x] Persist users, credentials, sessions, outlet memberships, menu configuration and sample orders.
- [x] Add email/password registration, sign-in and sign-out with Better Auth.
- [x] Give every public registration the customer role; reject client-controlled privilege changes.
- [x] Enforce customer ownership and kitchen outlet assignments in server queries.
- [x] Add central-admin-only menu access.
- [x] Seed the three brief orders and synthetic outlets, menu and demo accounts.
- [x] Add reusable form, button, shell, header, empty-state and order-list components.
- [x] Make Docker generate its local signing secret, apply migrations and opt in to demo seeding.
- [x] Add unit, API integration and browser-flow tests.

## Architecture and code organization

```text
src/app/                  Thin routes, pages, loading and error boundaries
src/features/auth/        Auth provider, validation, session lookup, roles and policies
src/features/orders/      Scoped order reads and shared presentation
src/features/menu/        Admin menu reads
src/features/outlets/     Scoped outlet reads
src/components/           Reusable UI and workspace shell
src/server/db/            Prisma client and PostgreSQL connection pool
src/server/http/          Safe HTTP error mapping
src/lib/                  Formatting and class-name utilities
prisma/                   Schema, versioned SQL migration and idempotent demo seed
scripts/                  Docker startup sequence
tests/                    Unit, API access and browser tests
```

You selected Better Auth + PostgreSQL in place of Supabase Auth so the local environment runs through Docker without a hosted account. The unused Supabase packages were removed. Realtime transport is still deferred to the kitchen iteration; this change does not claim that realtime is already implemented.

Server-rendered pages read through feature repositories, rather than calling their own HTTP endpoints. Client components are limited to interactive forms and sign-out. Repository queries always derive their scope from the authenticated viewer. Role and membership values are reread from the database; browser query parameters cannot select another identity or grant outlet access.

Reusable pieces are shared when behavior repeats. Feature-specific rules stay within their feature; no general-purpose service framework was introduced.

## Data and migration

The migration contains Better Auth tables (`User`, `Session`, `Account`, `Verification`, `RateLimit`) plus `Outlet`, `OutletMembership`, `MenuItem`, `MenuPortion`, `CityPrice`, `MenuAddon`, `OutletAvailability`, `Order`, `OrderItem` and `OrderEvent`.

- Prices and totals use integer paise. Seed order totals include 5% GST; tax is extracted from the inclusive total.
- Orders preserve purchased item names, portion names, unit prices, preparation times and allergens as snapshots.
- Preparation configuration is stored now; Gemini is not called in this iteration.
- SQL checks reject invalid coordinates, delivery radii, licence-number shape, negative prices, invalid spice levels and nonpositive quantities/preparation times.
- Database indexes cover order ownership, outlet queues and membership lookup.
- The seed creates missing records only. It does not reset passwords, edit existing orders, change promises or duplicate records on restart.
- Demo seeding is gated by `ENABLE_DEMO_DATA=true`; Compose opts in explicitly.

The brief's order IDs, item quantities, totals and payment methods are preserved. Initial timestamps are relative to the first seed run so the demo is inspectable. The third order is still `PREPARING`; lateness is calculated separately. Timers do not tick live yet, and timestamps are intentionally not reset on subsequent starts.

All addresses, users, licences, preparation settings and dietary metadata are synthetic. Only three representative outlets are seeded; this is not a claim that all 17 client locations have been configured. Menu photographs and service schedules arrive in later iterations.

## Authentication and security

- Better Auth owns password hashing, session cookies, origin checks and session revocation.
- Public registration creates `CUSTOMER` only. Staff/admin accounts and outlet assignments are provisioned server-side by the demo seed for now.
- Passwords require 12–128 characters; registration names require 2–80 characters. Provider validation runs on the server, not only in the form.
- Marketing opt-in defaults to false and is optional. No marketing or transactional messages are sent.
- Auth requests use database-backed rate limits, including stricter sign-in/sign-up limits.
- Sessions last up to seven days and are checked against persistent storage; cookie caching is disabled.
- Protected APIs return 401 for anonymous requests and 403 for forbidden roles. Out-of-scope order IDs return 404 to avoid revealing existence.
- Protected responses use `Cache-Control: no-store`. Internal database errors are not returned to customers.
- Next.js pages check access before fetching protected data. Streamed page redirects can have HTTP status 200; browser navigation and API authorization are tested separately.
- `.env`, generated clients and `.runtime` are ignored by Git. Docker excludes environment files from its build context.
- Docker creates a random local signing key in the `auth_runtime` volume. The key is not checked in or displayed. A separate ignored `.env` was created for native development during verification.

The checked-in database password and demo credentials are public local-development fixtures, not production secrets. Compose binds exposed services to loopback. Hosted production configuration, password recovery, email verification and a privacy/retention policy remain deployment work; this iteration must not be represented as a completed production authentication rollout.

## Screens and endpoints available

| Surface                   | Behavior                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `/login`                  | Sign-in, customer registration, optional marketing consent, local demo account details |
| `/`                       | Redirect to sign-in or the current role's workspace                                    |
| `/account`                | Customer's own persisted order history and empty state                                 |
| `/kitchen`                | Read-only assigned-outlet queue; excludes unpaid and inactive orders                   |
| `/admin/menu`             | Read-only shared menu, city prices and preparation settings                            |
| `/api/auth/*`             | Better Auth registration, sign-in, session and sign-out endpoints                      |
| `GET /api/me`             | Current viewer and assigned outlet IDs                                                 |
| `GET /api/orders`         | Role-scoped orders, capped at 50                                                       |
| `GET /api/orders/:id`     | Ownership/outlet-scoped lookup                                                         |
| `GET /api/kitchen/orders` | Kitchen/admin-only paid active queue                                                   |
| `GET /api/outlets`        | Active outlets, restricted to assigned outlets for kitchen staff                       |
| `GET /api/admin/menu`     | Central-admin-only menu data                                                           |

Order creation, payment, status mutation and menu editing endpoints are not implemented yet. The read-only workspaces say so explicitly instead of showing inert controls.

## Commands run

All repository commands below were run from `~/Desktop/isocode/restaurant-system` unless noted. Repeated checks during fixes are grouped together. No Git commit/push, database reset or destructive migration command was run.

```sh
# Inspection
git status --short
git log -1 --oneline
docker compose ps
npm view better-auth version
npm view @better-auth/prisma-adapter version
npm view @prisma/adapter-pg version

# Dependencies; exact resolved versions are committed in the lockfile
npm install --save-exact better-auth@1.7.16 @better-auth/prisma-adapter@1.7.16 @prisma/adapter-pg@7.10.1 pg server-only dotenv
npm install --save-dev --save-exact tsx @types/pg
npm uninstall @supabase/ssr @supabase/supabase-js

# Schema/client and additive migration
npm run db:generate
npm run db:migrate -- --name foundation --create-only
# SQL domain constraints were added before the migration was applied
npm run db:deploy
npm run db:seed
npm run db:seed

# Checks
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm run test:access
npx playwright install chromium
npx playwright test tests/e2e/auth-ui.spec.ts
npm run test:e2e
git diff --check
git check-ignore .env src/generated/prisma/client.ts
npm audit --omit=dev

# Local/runtime verification
docker compose stop app
npm run dev
docker compose build app
docker compose up --build -d
docker compose logs --tail=60 app
docker compose ps
```

The first lint pass found an unescaped apostrophe and render-time clock access; both were corrected. API tests initially omitted the browser Origin header and expected an unstreamed 307 redirect. The test harness was corrected; CSRF protection was kept enabled. The matching Chromium browser was installed before UI tests.

## Verification results

| Check                                            | Result                                                      |
| ------------------------------------------------ | ----------------------------------------------------------- |
| Prisma client generation and additive migration  | Passed                                                      |
| Seed executed twice                              | Passed; sample records preserved                            |
| Formatting, lint, TypeScript and diff whitespace | Passed                                                      |
| Unit tests                                       | 13 passed                                                   |
| API integration tests                            | 11 passed                                                   |
| Desktop/mobile and role-workspace browser tests  | 4 passed                                                    |
| Full integration/browser suite against Docker    | 15 passed                                                   |
| Production application build                     | Passed                                                      |
| Runtime dependency audit                         | Zero reported vulnerabilities                               |
| Docker bootstrap                                 | Passed: persistent signing key, migrations, seed, app ready |
| PostgreSQL container                             | Healthy                                                     |

Total distinct automated cases: 28. The production application build was verified; the production Docker target and hosted deployment have not yet been exercised. Docker verification used the development Compose target. Desktop sign-in was visually inspected; the 390px mobile registration flow was checked for horizontal overflow.

## Review locally

Docker Desktop must be running. From a fresh checkout:

```sh
docker compose up --build -d
docker compose logs -f app
```

Wait for the application to report ready, then open <http://localhost:3000>. No Supabase project or Gemini key is needed for this iteration. `docker ps` or `docker compose ps` lists containers; neither command starts them.

Use `localhost` for the browser URL because it matches the configured trusted origin. Existing PostgreSQL data survives restarts. Stop using `docker compose down` when finished; do not add `-v` unless you intend to delete local demo data and the signing key.

For native development, copy `.env.example` to `.env` on a fresh checkout, supply a random signing secret as described in that template, start the database with `docker compose up -d db`, then run `npm ci`, `npm run db:generate`, `npm run db:deploy` and `ENABLE_DEMO_DATA=true npm run db:seed`. Run `npm run dev` after that. Avoid running native and Docker app servers on port 3000 at the same time.

### Public local demo logins

Password for all demo accounts: `DemoAccess!2026`.

| Email                     | Role          | Expected access                                   |
| ------------------------- | ------------- | ------------------------------------------------- |
| `customer@demo.example`   | Customer      | WEB-778120 and WEB-778131 only                    |
| `customer2@demo.example`  | Customer      | WEB-778146 only                                   |
| `kondapur@demo.example`   | Kitchen staff | Kondapur only                                     |
| `gachibowli@demo.example` | Kitchen staff | Gachibowli only                                   |
| `admin@demo.example`      | Central admin | Shared menu and network-wide authorized API reads |

Review sequence:

1. Sign in as the first customer and check their two orders; sign out.
2. Sign in as Kondapur kitchen and check that the Gachibowli order is absent.
3. Try opening `/admin/menu` as kitchen staff; it should return you to your kitchen workspace.
4. Sign in as admin and inspect the five shared menu items and preparation settings.
5. Register a new customer. Marketing consent starts unchecked; order history starts empty.
6. Reload a signed-in page, then sign out and verify private APIs are inaccessible.

Browser tests create additional synthetic `@test.example` customer accounts. They contain no real personal data and may remain in the local demo database.

## Limits and next iteration

This is the foundation milestone. Kitchen data is a request-time snapshot; no realtime connection, moving timer, preparation-stage control or AI prediction is claimed. Preparation promises are marked provisional. Checkout, location routing, coupons, payments, photos, menu editing, schedules, notifications and manager controls remain future work. Optional loyalty, catering and analytics remain behind core completion.

The runtime dependency audit reports zero vulnerabilities; development lint tooling still reports 16 moderate advisories. No forced breaking dependency downgrade was applied to hide them. Production load, hosted deployment, HTTPS configuration and deployment-time migration execution have not been validated yet. The production Docker stage builds an application artifact; the development Compose startup owns migration/demo bootstrap.

The framework generated `AGENTS.md` while starting development, and automatically manages `next-env.d.ts`. The guidance was read and followed. Only actual diffs should be included in your commit; generated Prisma client files remain untracked.

Suggested review order: database schema/migration and seed; auth/session/policies; feature repositories; thin routes; reusable components/pages; tests.

Suggested commit after your review:

```text
feat: add persistent authentication and outlet-scoped foundation
```

The next iteration is customer serviceability, menu and cart, followed by validated checkout with mocked payments. Gemini remains scheduled for the final feature iteration. README.md and deployment.md will be written once the final setup/deployment steps are known.

## Implementation references

- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- [Better Auth server-owned user fields](https://better-auth.com/docs/concepts/database)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Prisma 7 PostgreSQL driver adapters](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers)
- Next.js guides bundled with the installed package: authentication, route handlers, server/client components and streamed redirects.
