# Iteration 11: Customer Loyalty Points & Checkout Redemption

## Objective
Implement direct-ordering customer loyalty rewards as mandated by the client brief: *"Regulars should earn rewards for ordering direct... Loyalty points on direct orders, redeemed at checkout."*

## Key Features Implemented

### 1. Loyalty Financial Model & Business Logic (`src/features/loyalty/calculator.ts`, `src/features/loyalty/constants.ts`)
- **Direct Earning Rule**: Customers earn **1 Loyalty Point for every ₹10 spent** (`10 points per ₹100 spent`) on paid direct orders.
- **Redemption Value**: **100 Loyalty Points = ₹50 discount** (`1 point = ₹0.50`).
- **Margin Protection Cap**: Points redemptions are capped at **50% of the payable order total**, ensuring restaurant margins remain protected even for customers with large points balances.

### 2. Database Ledger Architecture (`prisma/schema.prisma`)
- `LoyaltyAccount`: Dedicated account model tracking `pointsBalance`, `lifetimeEarned`, and `lifetimeRedeemed`.
- `LoyaltyTransaction`: Append-only financial audit ledger recording transaction type (`EARNED`, `REDEEMED`, `REFUNDED`), points deltas, timestamps, and order references.
- `Order` snapshot extensions: Stores `pointsRedeemed`, `pointsDiscountPaise`, and `pointsEarned` directly on the order record for immutable auditability.

### 3. Pricing & Checkout Integration (`src/features/checkout/pricing.ts`, `quote-service.ts`, `order-service.ts`, `payment-service.ts`)
- `calculateTotals`: Dynamically accepts customer loyalty balance and redemption intent, deducting points savings and calculating inclusive 5% GST (CGST/SGST) on the final paid amount.
- `processMockPayment`: In an atomic database transaction on payment success, automatically deducts redeemed points and credits newly earned points.

### 4. User Interface (`src/features/checkout/components/*`, `src/app/account/page.tsx`)
- **Checkout Experience**: Interactive Royal Rewards toggle tile displaying available points and rupee equivalent savings.
- **Price Breakdown**: Displays itemized `✨ Royal Rewards (-₹XX.XX)` deduction line.
- **Account Screen (`/account`)**: Royal Rewards Wallet displaying points balance, rupee value, earning rule highlights, lifetime stats, and recent ledger entries.

## Verification
- Unit test suite: `tests/unit/loyalty.test.ts` (6/6 tests passing).
- Full test run: 76/76 tests passing across 13 test suites.
- Typecheck: 0 errors (`tsc --noEmit`).
- Lint: 0 errors/warnings (`eslint .`).
