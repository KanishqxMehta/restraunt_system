# Iteration 02 — Customer ordering and test checkout

Date: 4 November 2026 (Asia/Kolkata)  
Repository: `restaurant-system`  
Starting commit: `129aabd` — `chore: foundations and auth`  
Review status: ready for review. No commit or push made by Codex.

## What this iteration delivers

A signed-in customer can select a delivery location and eligible outlet, browse the photo menu, choose portions/add-ons, edit a basket, apply a coupon, confirm server-calculated pricing, complete a mocked UPI/card payment and open their private order receipt. Paid orders become `NEW` in the assigned kitchen's existing queue. The kitchen still needs a refresh; realtime and preparation-stage controls belong to Iteration 03.

- [x] Location permission flow, manual coordinates and three labelled demo locations.
- [x] Radius-based, nearest-open-outlet recommendations and explicit alternatives.
- [x] No-service-area, closed-outlet, loading, empty and error states.
- [x] Photo menu, search, category filters, dietary symbols, spice levels and allergens.
- [x] Portions, optional add-ons, quantities, removal and outlet-change confirmation.
- [x] Basket recovery after reload, scoped to the signed-in user and browser tab.
- [x] Delivery address, coupons and inclusive 5% GST breakdown.
- [x] Server-owned five-minute quotes and immutable purchased-item snapshots.
- [x] Idempotent pending orders and test payment attempts.
- [x] Success, decline, cancellation and retry; unpaid orders stay out of the kitchen.
- [x] Private receipt/status view, manual refresh and history links.
- [x] Local photo assets, licence attribution and production Docker asset copying.
- [x] Additive migration, legacy order backfill and fresh-database seed checks.

Gemini is not called. Preparation time is explicitly provisional and comes from the outlet minimum plus its configured packing time.

## Design and modularity

The customer menu keeps the green, warm-white and restrained amber palette from sign-in. Large food photos, short descriptions and clear prices lead the screen. The desktop basket stays beside the menu; on a phone, a fixed basket link opens checkout. Native modal focus handling supports portion/add-on selection. Checkout shows its complete total before offering test payment.

New behavior is grouped under existing feature boundaries:

```text
features/outlets/     Pure distance/opening-hour rules and location picker
features/menu/        Public menu DTO, catalog reads, reusable dish card/configurator
features/cart/        Validated tab store, context, local preview and basket component
features/checkout/    Pricing, validation, quote/order/payment services and forms
features/orders/      Snapshot rendering, private receipt loading and refresh control
server/db/            Serializable transaction wrapper and conflict classification
server/http/          Same-origin checks and bounded JSON parsing
app/(customer)/       Shared authenticated customer shell and cart lifetime
```

Quote calculation, pending-order creation and mock payment fulfillment are separate modules. The API routes validate/authenticate and delegate to those modules. Pricing and serviceability rules are pure functions with unit tests. Payment-method controls, price breakdowns, dish cards and basket UI are shared rather than copied between screens.

The customer role now lands on `/order` after sign-in. `/account` remains the private order history and is available from “My orders”. Staff/admin entry routes remain unchanged.

## Data model and migration

Migration: `20261104093203_customer_checkout`.

New models: `CheckoutQuote`, `Coupon`, `CouponRedemption`, `PaymentAttempt`. New order fields preserve the quote reference, idempotency key, subtotal/discount, coupon, delivery address/pin and payment expiry. Purchased add-ons are JSON snapshots on order items. Menu add-ons now have allergen metadata; outlets have daily opening/closing minute fields.

The migration is additive. It backfills old subtotals from existing totals, sets the demo raita allergen, and adds database checks for discount arithmetic, delivery coordinates, coupon configuration and opening-hour ranges. Existing orders, users and passwords are preserved. Seed upgrades fill only missing menu photos and create the DIRECT10 coupon if absent.

A disposable empty database was created for verification, both migrations were applied, and seeding ran twice. It still had exactly three sample orders, five menu photos and one coupon. That disposable database was removed; the normal local database was preserved.

## Consistency, security and failure handling

### Pricing and quotes

The browser sends portion IDs, add-on IDs, quantities, outlet and location—not prices or totals. Strict schemas reject invented pricing fields, invalid quantities, duplicate lines and foreign add-ons. The server loads the outlet's city prices and availability, checks radius and current opening hours, validates the coupon, and calculates money in integer paise.

Displayed prices already contain GST. After discounts, included GST is extracted using `total × 5 / 105`; it is never added again. CGST/SGST share the rounded included tax, with a possible one-paise rounding difference.

Quotes expire after five minutes. Their server-side snapshot fingerprint covers prices, purchased metadata, coupon savings, outlet and provisional preparation time. Order creation recomputes it; a stale quote requires fresh review. No successful payment is recorded if availability or pricing changed before fulfillment.

### Orders and test payments

- One quote can produce one order. A customer-scoped idempotency key also prevents duplicate submissions.
- Creation retries are bound to the same quote and delivery address. Payment method can be selected again in the test-payment screen.
- Pending orders have a ten-minute payment window. Creating the pending order does not send it to the kitchen.
- A successful payment rechecks stock, serviceability, hours and the approved price snapshot. Its ready-time promise starts at successful payment.
- Payment attempts have their own idempotency keys. Reusing an attempt key for a different outcome/method returns 409.
- Replaying a successful payment cannot create another kitchen event or coupon redemption, and later failures cannot undo payment.
- Decline/cancellation leaves the order unpaid and retryable. Expired payment windows require a fresh checkout.
- Coupon usage is consumed only on successful payment, in the same transaction as the order transition.
- Serializable transactions retry Prisma and PostgreSQL-adapter write conflicts. Bounded backoff is used; exhausted retries return a reviewable conflict rather than an internal error.

No real payment gateway, bank verification, UPI PIN, card number or SMS is involved. The interface explicitly says test mode.

### Access and personal data

Only customer-role accounts can create quotes, orders or payment attempts. Quote ownership and order ownership are checked on the server. Other customers receive 404; staff cannot invoke customer payment operations. Kitchen queue queries still require an assigned outlet and a paid active order.

Mutation routes check Origin and content type, stream-limit JSON bodies to 32 KB, and return safe errors. Protected responses are not cached. No signing secrets were added to tracked files.

The cart stores IDs, quantities and a location pin in user-scoped `sessionStorage`; it contains no delivery address, payment credentials or email. Its lifetime follows the browser tab/session behavior; browser session restoration can preserve it. The delivery address is persisted only on order confirmation. Quote pins and order addresses remain in the local database; automated retention/deletion is not implemented yet. No personal data is sent to an AI or mapping provider in this iteration.

### Concrete edge cases covered

| Scenario                              | Behavior                                                           |
| ------------------------------------- | ------------------------------------------------------------------ |
| Location permission denied            | Recover through a labelled demo area or manual pin                 |
| No open outlet covers the pin         | Explain unavailability; prevent checkout                           |
| Overlapping delivery areas            | Recommend nearest eligible outlet; allow another eligible choice   |
| Overnight hours or closing boundary   | Evaluate in Asia/Kolkata; closing time is exclusive                |
| Switching outlet with a basket        | Require confirmation; accept clears items, cancel preserves them   |
| Stock or city-price changes           | Reject stale order/payment and request fresh review                |
| Expired/invalid/not-yet-active coupon | Reject it with a useful message                                    |
| Concurrent last-coupon redemption     | At most one succeeds; the other receives a conflict                |
| Double click or lost-response retry   | Return the same order/payment result without duplicate fulfillment |
| Paid attempt followed by decline      | Keep the paid order unchanged                                      |
| Expired quote or payment session      | Require fresh checkout; keep unpaid work out of kitchen            |
| Reload during purchase                | Restore the same user's basket; pending payment URL can resume     |
| Another customer's quote/order ID     | Deny access without revealing the record                           |
| Broken browser storage                | Continue in memory; server validation remains authoritative        |

## Screens and endpoints

| Surface                             | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `/order`                            | Location/outlet selection, menu, dish configuration and basket |
| `/checkout`                         | Delivery details, coupon and server-confirmed total            |
| `/checkout?order=:id`               | Resumable mocked payment                                       |
| `/orders/:id`                       | Private receipt and current preparation stage; manual refresh  |
| `/account`                          | Private history with working order links                       |
| `/photo-credits`                    | Photo source/licence attribution                               |
| `POST /api/serviceability`          | Public eligible-outlet lookup from coordinates                 |
| `GET /api/outlets/:id/menu`         | Public city-priced menu and outlet availability                |
| `POST /api/checkout/quote`          | Customer-only authoritative quote                              |
| `POST /api/orders`                  | Customer-only idempotent pending order                         |
| `POST /api/orders/:id/mock-payment` | Customer-owned test payment attempt                            |

Existing role-protected API reads remain available. Stock pauses already affect quote/payment checks, but the staff stock-toggle UI has not been added yet.

## Commands run

From `~/Desktop/isocode/restaurant-system` unless noted. Commands repeated during fixes are grouped. No repository commit/push or database reset was performed.

```sh
# Repository and installed framework guidance
git status --short
git log -2 --oneline
cat AGENTS.md
# Read relevant installed Next.js route/server-component guidance

# Dependencies and Prisma client
npm ls --depth=0
npm ci
npm run db:generate

# Migration creation (interactive migrate dev was unavailable in this tool environment)
npm run db:migrate -- --name customer_checkout --create-only
npx prisma migrate diff --help
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# The SQL output was written to the versioned migration and domain checks added before deploy
npm run db:deploy
npm run db:seed

# Checks
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npx playwright test tests/e2e/checkout.spec.ts
npx playwright test tests/e2e/checkout.spec.ts -g 'coupon usage'
npx playwright test tests/e2e/checkout.spec.ts -g 'mobile customer|inactive, future'
npx playwright test tests/e2e/ordering-ui.spec.ts
git diff --check
npm audit --omit=dev

# Preview and container verification
docker compose stop app
npm run dev
docker compose build app
docker compose up --build -d
docker compose logs --tail=60 app
docker compose ps
```

Additional checks used a temporary `iteration2_smoke_<random>` database: create it via local PostgreSQL, run `db:deploy`, run `db:seed` twice against that database, query fixture counts, then drop that owned test database. Normal project data was not deleted. Photos and attribution metadata were downloaded from Wikimedia Commons and stored under `public/menu`; no image service is contacted at runtime. Playwright captured local screenshots for desktop-menu and phone-dialog inspection.

A missing local `@prisma/client` package was repaired with `npm ci`; versions were not changed. A coupon concurrency test exposed raw pg-adapter conflicts that needed classification in addition to Prisma error codes; the shared retry policy now handles both. Test requests retain CSRF protection. A browser assertion was narrowed to the payment alert because Next.js also exposes a route-announcement alert.

## Verification results

| Check                                            | Result                                                          |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Formatting, lint, TypeScript and diff whitespace | Passed                                                          |
| Unit tests                                       | 33 passed                                                       |
| API integration tests                            | 23 passed                                                       |
| Browser flows                                    | 7 passed, including phone checkout and location/outlet recovery |
| Complete API/browser suite against Docker        | 30 passed                                                       |
| Production Next.js application build             | Passed                                                          |
| Empty-database migrations and repeat seeding     | Passed; 3 orders, 5 photos, 1 coupon                            |
| Docker build and startup                         | Passed; both migrations and seed bootstrap succeed              |
| PostgreSQL container                             | Healthy                                                         |
| Runtime dependency audit                         | Zero reported vulnerabilities                                   |
| Visual checks                                    | Desktop menu and phone configuration dialog inspected           |

Total distinct automated cases: **63**. The final Docker integration/browser suite completed in about 29 seconds; this is automated test time, not a human checkout measurement. Docker verification used the development Compose target and Node 22. Native checks used the host's Node 26. The production application build passed, but the production Docker target and a hosted deployment were not exercised in this iteration.

Your existing `.gitignore` excludes `docs/`. This report is a local review artifact and is also supplied as a downloadable copy; the ignore rule was preserved. It will not be included in a normal Git commit unless you deliberately change that rule.

## How to review

```sh
cd ~/Desktop/isocode/restaurant-system
docker compose up --build -d
```

Open <http://localhost:3000>. Sign in with `customer@demo.example` and password `DemoAccess!2026`. Existing demo logins from Iteration 01 are unchanged.

1. Choose the Kondapur demo location, then the nearest outlet.
2. Open Chicken dum biryani; try Regular/Family pack and Extra raita.
3. Edit quantities, reload, and confirm the basket remains.
4. Try changing outlet, first cancelling and then accepting the clear-basket confirmation.
5. Add a dish again and go to checkout. Use a synthetic delivery address.
6. Apply `DIRECT10`, review the GST-inclusive total, and continue to test payment.
7. Try Declined or Cancelled, then retry with Successful payment. Try Card as well as UPI.
8. Check the private receipt and its history link. Sign in as Kondapur kitchen in another browser session and refresh to see the paid order; unpaid orders must be absent.
9. Test location denial/manual pin `(0, 0)` and an invalid coupon.
10. Inspect dietary/allergen/FSSAI details and photo credits.

Unit tests use `npm test`. Browser/API integration tests use `npm run test:e2e` with the app running at localhost:3000. The checkout suite requires an ignored local `.env` with the local `DATABASE_URL` and `ENABLE_DEMO_DATA=true`; it refuses remote/non-demo databases. It creates synthetic fixture customers directly, then authenticates normally. Some cases temporarily change demo stock/prices and restore them in `finally`; run this suite against the local demo rather than a shared reviewer session. Test customers, unpaid orders and coupons may remain in the demo database.

## Assumptions and limits to carry into the TDD

- Seed locations, radii, FSSAI licences, daily hours, prices, allergens and preparation times are synthetic.
- Demo outlets operate 24 hours; opening-hour logic supports closure/overnight operation, but a scheduling CMS is still pending.
- Location selection uses a browser pin or labelled demo coordinates; there is no address geocoder, map service or verification that typed address matches the pin.
- Customer sign-in currently precedes the ordering screen. Public menu/serviceability endpoints do not expose customer data.
- Delivery is mocked and free in the demo. Kitchen-ready time excludes travel time.
- DIRECT10 is synthetic: 10% off a ₹300 minimum, capped at ₹100. It has no production campaign policy.
- Online limits are 30 unique lines, 20 portions per line, 100 total portions and ₹10 lakh subtotal. Larger party ordering is outside this slice.
- Preparation is a placeholder: outlet minimum plus packing time. Gemini/current-load estimation remains last.
- Status refresh is manual. Realtime, reconnect recovery, kitchen timers/stage transitions/handoff controls and notification automation remain Iteration 03 work.
- Central menu editing, schedule management, loyalty, catering and analytics remain future iterations.
- Expired unpaid orders are excluded from kitchen work but are not automatically deleted/cancelled. Quote/personal-data retention jobs remain future work.
- Automated browser speed does not establish the client's human median-checkout target. Production peak-load capacity and hosted deployment are not claimed.
- Development dependencies retain the previously reported moderate advisories; no forced breaking dependency change was applied.

## Project checklist after this iteration

| Requirement                                    | State                                 |
| ---------------------------------------------- | ------------------------------------- |
| Database, sign-in, customer/staff/admin access | Implemented                           |
| Delivery radius/outlet routing                 | Implemented with synthetic pins/radii |
| Photo menu, portions, add-ons, cart, coupons   | Implemented                           |
| Mock UPI/card checkout                         | Implemented                           |
| Private order status/receipt                   | Implemented with manual refresh       |
| Central menu CMS editing and schedules         | Pending                               |
| Live outlet kitchen display and handoff        | Pending; read-only queue exists       |
| Prep-time AI and error/override handling       | Deferred to final feature iteration   |
| Notifications and overdue automation           | Pending                               |
| Loyalty, catering, outlet dashboard            | Optional depth, pending               |
| TDD, README.md, deployment.md and final ZIP    | Final delivery iteration              |

Suggested review order: migration and snapshots; pricing/validation; quote/order/payment services and transaction wrapper; customer cart/menu/checkout UI; regression and race-condition tests.

Suggested commit after your review:

```text
feat: add customer ordering and idempotent test checkout
```

Next iteration: realtime kitchen display, stage transitions, timers, handoff and customer status updates. No further implementation will start before your review of this iteration.
