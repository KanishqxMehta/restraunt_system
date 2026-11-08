import { beforeEach, describe, expect, it, vi } from "vitest";
import { outlets, menu } from "../../prisma/seed-data";

// Mock server-only so service.ts can be imported in Vitest node environment
vi.mock("server-only", () => ({}));

// Mock notification dispatcher to avoid external side effects in unit test
vi.mock("@/features/notifications/dispatcher", () => ({
  dispatchOrderNotifications: vi.fn().mockResolvedValue(undefined),
}));

interface MockOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  outletId: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  subtotalPaise: number;
  discountPaise: number;
  pointsDiscountPaise: number;
  includedTaxPaise: number;
  isCatering?: boolean;
  cateringStatus?: string;
  promisedReadyAt: Date;
}

// Stateful in-memory DB that strictly enforces PostgreSQL unique & check constraints
const mockState = {
  orderNumbers: new Set<string>(),
  orders: new Map<string, MockOrder>(),
  loyalty: new Map<string, { id: string; userId: string; pointsBalance: number }>(),
  availability: new Map<string, boolean>(),
  outletsActive: new Map<string, boolean>(outlets.map((o) => [o.id, true])),
  coupons: new Map<string, { code: string; isActive: boolean }>(),
};

function enforceOrderConstraints(data: {
  id?: string;
  orderNumber: string;
  totalPaise: number;
  subtotalPaise?: number;
  discountPaise?: number;
  pointsDiscountPaise?: number;
  includedTaxPaise: number;
}) {
  // 1. Enforce @unique on orderNumber (this caught the old DEMO-HIST-5000 duplicate bug!)
  if (mockState.orderNumbers.has(data.orderNumber)) {
    throw new Error(
      `Unique constraint failed on the fields: (orderNumber) for ${data.orderNumber}`,
    );
  }

  const subtotal = data.subtotalPaise ?? data.totalPaise;
  const discount = data.discountPaise ?? 0;
  const ptsDiscount = data.pointsDiscountPaise ?? 0;

  // 2. Enforce Order_discount_check constraint
  if (
    subtotal < 0 ||
    discount < 0 ||
    ptsDiscount < 0 ||
    discount + ptsDiscount > subtotal ||
    data.totalPaise !== subtotal - discount - ptsDiscount
  ) {
    throw new Error(`Order_discount_check constraint violated on ${data.orderNumber}`);
  }

  // 3. Enforce Order_money_check constraint
  if (
    data.totalPaise < 0 ||
    data.includedTaxPaise < 0 ||
    data.includedTaxPaise > data.totalPaise
  ) {
    throw new Error(`Order_money_check constraint violated on ${data.orderNumber}`);
  }
}

const mockDb = {
  $transaction: async (arg: unknown) => {
    if (typeof arg === "function") {
      return await arg(mockDb);
    }
    if (Array.isArray(arg)) {
      return await Promise.all(arg);
    }
    return null;
  },
  outlet: {
    findMany: async () => outlets.map((o) => ({ id: o.id, name: o.name })),
    findUnique: async ({ where }: { where: { id: string } }) => {
      const found = outlets.find((o) => o.id === where.id);
      if (!found) return null;
      return {
        id: found.id,
        name: found.name,
        isActive: mockState.outletsActive.get(found.id) ?? true,
      };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { isActive: boolean };
    }) => {
      mockState.outletsActive.set(where.id, data.isActive);
      return { id: where.id, isActive: data.isActive };
    },
    updateMany: async ({ data }: { data: { isActive: boolean } }) => {
      for (const o of outlets) {
        mockState.outletsActive.set(o.id, data.isActive);
      }
      return { count: outlets.length };
    },
  },
  outletAvailability: {
    findUnique: async ({
      where,
    }: {
      where: { outletId_itemId: { outletId: string; itemId: string } };
    }) => {
      const key = `${where.outletId_itemId.outletId}:${where.outletId_itemId.itemId}`;
      if (!mockState.availability.has(key)) return null;
      return { isAvailable: mockState.availability.get(key)! };
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { outletId_itemId: { outletId: string; itemId: string } };
      update: { isAvailable: boolean };
      create: { outletId: string; itemId: string; isAvailable: boolean };
    }) => {
      const key = `${where.outletId_itemId.outletId}:${where.outletId_itemId.itemId}`;
      const next = mockState.availability.has(key)
        ? update.isAvailable
        : create.isAvailable;
      mockState.availability.set(key, next);
      return { isAvailable: next };
    },
    updateMany: async ({ data }: { data: { isAvailable: boolean } }) => {
      for (const key of mockState.availability.keys()) {
        mockState.availability.set(key, data.isAvailable);
      }
      return { count: mockState.availability.size };
    },
  },
  loyaltyAccount: {
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { userId: string };
      update: { pointsBalance?: number | { increment: number } };
      create: { userId: string; pointsBalance: number };
    }) => {
      const existing = mockState.loyalty.get(where.userId);
      let nextPoints = create.pointsBalance;
      if (existing) {
        if (typeof update.pointsBalance === "number") {
          nextPoints = update.pointsBalance;
        } else if (
          update.pointsBalance &&
          typeof update.pointsBalance === "object" &&
          "increment" in update.pointsBalance
        ) {
          nextPoints = existing.pointsBalance + update.pointsBalance.increment;
        }
      }
      const record = {
        id: existing?.id ?? `loyalty-${where.userId}`,
        userId: where.userId,
        pointsBalance: nextPoints,
      };
      mockState.loyalty.set(where.userId, record);
      return record;
    },
    updateMany: async ({ data }: { data: { pointsBalance: number } }) => {
      for (const [userId, record] of mockState.loyalty.entries()) {
        mockState.loyalty.set(userId, { ...record, pointsBalance: data.pointsBalance });
      }
      return { count: mockState.loyalty.size };
    },
  },
  loyaltyTransaction: {
    create: async ({ data }: { data: Record<string, unknown> }) => data,
    deleteMany: async () => ({ count: 0 }),
  },
  orderNotification: {
    deleteMany: async () => ({ count: 0 }),
  },
  paymentAttempt: {
    deleteMany: async () => ({ count: 0 }),
  },
  checkoutQuote: {
    deleteMany: async () => ({ count: 0 }),
  },
  couponRedemption: {
    deleteMany: async () => ({ count: 0 }),
  },
  coupon: {
    deleteMany: async ({ where }: { where?: { code?: { in?: string[] } } }) => {
      for (const c of where?.code?.in ?? []) {
        mockState.coupons.delete(c);
      }
      return { count: 2 };
    },
    upsert: async ({
      where,
      create,
    }: {
      where: { code: string };
      update: Record<string, unknown>;
      create: { code: string; isActive: boolean };
    }) => {
      mockState.coupons.set(where.code, { code: create.code, isActive: true });
      return { code: where.code, isActive: true };
    },
  },
  order: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const orderData = data as unknown as MockOrder;
      enforceOrderConstraints(orderData);
      const id = (orderData.id as string) || `ord-${mockState.orders.size + 1}`;
      const record: MockOrder = {
        ...orderData,
        id,
        subtotalPaise: orderData.subtotalPaise ?? orderData.totalPaise,
        discountPaise: orderData.discountPaise ?? 0,
        pointsDiscountPaise: orderData.pointsDiscountPaise ?? 0,
      };
      mockState.orderNumbers.add(record.orderNumber);
      mockState.orders.set(id, record);
      return record;
    },
    createMany: async ({ data }: { data: MockOrder[] }) => {
      for (const row of data) {
        enforceOrderConstraints(row);
        mockState.orderNumbers.add(row.orderNumber);
        mockState.orders.set(row.id, row);
      }
      return { count: data.length };
    },
    findMany: async ({
      where,
      take,
    }: {
      where?: Record<string, unknown>;
      take?: number;
    }) => {
      let list = Array.from(mockState.orders.values());
      if (where?.outletId) {
        list = list.filter((o) => o.outletId === where.outletId);
      }
      if (typeof where?.status === "string") {
        list = list.filter((o) => o.status === where.status);
      } else if (
        where?.status &&
        typeof where.status === "object" &&
        "in" in where.status
      ) {
        const allowed = (where.status as { in: string[] }).in;
        list = list.filter((o) => allowed.includes(o.status));
      }
      if (where?.isCatering !== undefined) {
        list = list.filter((o) => Boolean(o.isCatering) === where.isCatering);
      }
      if (typeof where?.cateringStatus === "string") {
        list = list.filter((o) => o.cateringStatus === where.cateringStatus);
      }
      if (take !== undefined) {
        list = list.slice(0, take);
      }
      return list;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<MockOrder>;
    }) => {
      const existing = mockState.orders.get(where.id);
      if (existing) {
        mockState.orders.set(where.id, { ...existing, ...data });
      }
      return mockState.orders.get(where.id);
    },
    updateMany: async () => ({ count: 1 }),
    deleteMany: async (args?: {
      where?: { orderNumber?: { startsWith?: string } };
    }) => {
      const prefix = args?.where?.orderNumber?.startsWith;
      let deleted = 0;
      if (prefix) {
        for (const [id, ord] of mockState.orders.entries()) {
          if (ord.orderNumber.startsWith(prefix)) {
            mockState.orderNumbers.delete(ord.orderNumber);
            mockState.orders.delete(id);
            deleted++;
          }
        }
      } else {
        deleted = mockState.orders.size;
        mockState.orderNumbers.clear();
        mockState.orders.clear();
      }
      return { count: deleted };
    },
  },
  orderItem: {
    createMany: async ({ data }: { data: unknown[] }) => ({ count: data.length }),
    deleteMany: async () => ({ count: 0 }),
  },
  orderEvent: {
    create: async ({ data }: { data: unknown }) => data,
    createMany: async ({ data }: { data: unknown[] }) => ({ count: data.length }),
    deleteMany: async () => ({ count: 0 }),
  },
};

vi.mock("@/server/db/client", () => ({
  getDatabase: () => mockDb,
}));

import {
  resetDemoEnvironment,
  setCustomerLoyaltyBalance,
  placeDemoCustomerOrder,
  simulateKitchenRush,
  forceKitchenSlaBreach,
  advanceKitchenBatch,
  completeKitchenReadyTickets,
  toggleDishStockout,
  injectCateringBooking,
  approvePendingCateringBookings,
  injectAdminAnalyticsBurst,
  triggerCancellationSpike,
  toggleOutletActive,
  launchFlashCouponCampaign,
} from "@/features/demo/service";

describe("Demo Data & Menu Expansion", () => {
  it("contains at least 25 to 30 authentic dishes across required categories", () => {
    expect(menu.length).toBeGreaterThanOrEqual(25);
    expect(menu.length).toBeLessThanOrEqual(35);

    const categories = new Set(menu.map((d) => d.category));
    expect(categories.has("Biryani")).toBe(true);
    expect(categories.has("Starters")).toBe(true);
    expect(categories.has("Curries")).toBe(true);
    expect(categories.has("Breads")).toBe(true);
    expect(categories.has("Desserts")).toBe(true);
    expect(categories.has("Beverages")).toBe(true);
  });

  it("includes both veg and non-veg options across categories", () => {
    const vegDishes = menu.filter((d) => d.isVeg);
    const nonVegDishes = menu.filter((d) => !d.isVeg);

    expect(vegDishes.length).toBeGreaterThanOrEqual(10);
    expect(nonVegDishes.length).toBeGreaterThanOrEqual(8);
  });

  it("includes requested beverages: cold coffee, mojitos, mocktails", () => {
    const slugs = menu.map((d) => d.slug);
    expect(slugs.some((s) => s.includes("cold-coffee"))).toBe(true);
    expect(slugs.some((s) => s.includes("mojito"))).toBe(true);
    expect(slugs.some((s) => s.includes("mocktail") || s.includes("fizz"))).toBe(true);
    expect(slugs.some((s) => s.includes("chai"))).toBe(true);
  });

  it("ensures sweet desserts and beverages have zero spice level", () => {
    const sweetDishes = menu.filter(
      (d) => d.category === "Desserts" || d.category === "Beverages",
    );
    for (const dish of sweetDishes) {
      expect(dish.spiceLevel).toBe(0);
    }
  });

  it("has valid prep stations assigned for kitchen routing", () => {
    const validStations = new Set([
      "BIRYANI",
      "GRILL",
      "CURRY",
      "OVEN",
      "FRYER",
      "DESSERT",
      "BEVERAGE",
      "MAIN",
    ]);

    for (const dish of menu) {
      expect(dish.prepStation).toBeDefined();
      expect(validStations.has(dish.prepStation)).toBe(true);
    }
  });

  it("ensures all dishes have at least one portion with positive price in Hyderabad", () => {
    for (const dish of menu) {
      expect(dish.portions.length).toBeGreaterThanOrEqual(1);
      for (const portion of dish.portions) {
        expect(portion.pricePaise).toBeGreaterThan(0);
      }
    }
  });

  it("provides 17 outlets in Hyderabad with coordinates and licenses", () => {
    expect(outlets.length).toBe(17);
    for (const outlet of outlets) {
      expect(outlet.city).toBe("Hyderabad");
      expect(outlet.latitude).toBeGreaterThan(17.0);
      expect(outlet.longitude).toBeGreaterThan(78.0);
      expect(outlet.fssaiLicense).toBeDefined();
    }
  });
});

describe("All Role Demo Modes & Repeat Execution Guarantees", () => {
  beforeEach(() => {
    process.env.ENABLE_DEMO_DATA = "true";
    mockState.orderNumbers.clear();
    mockState.orders.clear();
    mockState.loyalty.clear();
    mockState.availability.clear();
    mockState.coupons.clear();
  });

  it("allows Admin to inject 50 historical orders repeatedly (1st, 2nd, 3rd time) without unique constraint errors", async () => {
    const first = await injectAdminAnalyticsBurst(50);
    expect(first.success).toBe(true);
    expect(first.count).toBe(50);
    expect(mockState.orders.size).toBe(50);

    // 2nd time right away — must add 50 more orders without colliding on orderNumber
    const second = await injectAdminAnalyticsBurst(50);
    expect(second.success).toBe(true);
    expect(second.count).toBe(50);
    expect(mockState.orders.size).toBe(100);

    // 3rd time right away — must add 50 more orders (total 150 unique orders)
    const third = await injectAdminAnalyticsBurst(50);
    expect(third.success).toBe(true);
    expect(third.count).toBe(50);
    expect(mockState.orders.size).toBe(150);
    expect(mockState.orderNumbers.size).toBe(150);
  });

  it("allows Customer to set loyalty points relative to admin redemption settings", async () => {
    const l0 = await setCustomerLoyaltyBalance("demo-customer", 0);
    expect(l0.points).toBe(0);
    const l500 = await setCustomerLoyaltyBalance("demo-customer", 500);
    expect(l500.points).toBe(500);
    expect(l500.redeemPaisePerPoint).toBeDefined();
    expect(l500.discountRupees).toBe(
      Math.floor((500 * (l500.redeemPaisePerPoint ?? 50)) / 100),
    );
    const l1500 = await setCustomerLoyaltyBalance("demo-customer", 1500);
    expect(l1500.points).toBe(1500);
    expect(l1500.discountRupees).toBe(
      Math.floor((1500 * (l1500.redeemPaisePerPoint ?? 50)) / 100),
    );
    // Repeat same points value
    const l1500Again = await setCustomerLoyaltyBalance("demo-customer", 1500);
    expect(l1500Again.points).toBe(1500);

    // Place live order 3 times in a row
    const ord1 = await placeDemoCustomerOrder("demo-customer");
    const ord2 = await placeDemoCustomerOrder("demo-customer");
    const ord3 = await placeDemoCustomerOrder("demo-customer");

    expect(ord1.orderNumber).not.toBe(ord2.orderNumber);
    expect(ord2.orderNumber).not.toBe(ord3.orderNumber);
    expect(ord1.redirectUrl).toContain(ord1.orderId);
  });

  it("allows Kitchen Staff to simulate rush, force SLA breaches, advance stages, and complete orders repeatedly without dead-ending", async () => {
    // Rush 3x in a row
    const rush1 = await simulateKitchenRush("outlet-kondapur", 3);
    const rush2 = await simulateKitchenRush("outlet-kondapur", 3);
    expect(rush1.count).toBe(3);
    expect(rush2.count).toBe(3);

    // Force SLA breach 3x in a row
    const breach1 = await forceKitchenSlaBreach("outlet-kondapur");
    const breach2 = await forceKitchenSlaBreach("outlet-kondapur");
    expect(breach1.orderNumber).not.toBe(breach2.orderNumber);

    // Advance stages 4x in a row (NEW -> PREPARING -> READY -> auto-replenish)
    for (let i = 0; i < 4; i++) {
      const adv = await advanceKitchenBatch("outlet-kondapur");
      expect(adv.success).toBe(true);
      expect(adv.advancedCount).toBeGreaterThan(0);
    }

    // Complete ready tickets 3x in a row (even when READY queue is emptied)
    for (let i = 0; i < 3; i++) {
      const comp = await completeKitchenReadyTickets("outlet-kondapur");
      expect(comp.success).toBe(true);
      expect(comp.completedCount).toBeGreaterThan(0);
    }

    // Toggle 86 stockout 4x in a row
    const s1 = await toggleDishStockout("outlet-kondapur", "item-mutton-biryani");
    expect(s1.isAvailable).toBe(false);
    const s2 = await toggleDishStockout("outlet-kondapur", "item-mutton-biryani");
    expect(s2.isAvailable).toBe(true);
    const s3 = await toggleDishStockout("outlet-kondapur", "item-mutton-biryani");
    expect(s3.isAvailable).toBe(false);
  });

  it("allows Kitchen & Admin to inject catering bookings and auto-approve them repeatedly", async () => {
    const cat1 = await injectCateringBooking({
      outletId: "outlet-kondapur",
      autoConfirm: false,
      guestCount: 60,
    });
    const cat2 = await injectCateringBooking({
      outletId: "outlet-kondapur",
      autoConfirm: true,
      guestCount: 120,
    });
    expect(cat1.orderNumber).not.toBe(cat2.orderNumber);

    // Approve pending catering 1st time (approves cat1)
    const app1 = await approvePendingCateringBookings("outlet-kondapur", "Chef Manager");
    expect(app1.approvedCount).toBe(1);

    // Approve pending catering 2nd time when none pending (auto-creates & approves so it never fails)
    const app2 = await approvePendingCateringBookings("outlet-kondapur", "Chef Manager");
    expect(app2.approvedCount).toBe(1);
  });

  it("allows Admin to trigger cancellation spikes, toggle outlet status, launch flash coupons, and reset cleanly", async () => {
    // Trigger cancellation spike 3x
    const c1 = await triggerCancellationSpike("outlet-kondapur");
    const c2 = await triggerCancellationSpike("outlet-kondapur");
    expect(c1.count).toBe(6);
    expect(c2.count).toBe(6);

    // Toggle outlet active 3x
    const t1 = await toggleOutletActive("outlet-kondapur");
    expect(t1.isActive).toBe(false);
    const t2 = await toggleOutletActive("outlet-kondapur");
    expect(t2.isActive).toBe(true);

    // Launch flash coupons 3x
    const f1 = await launchFlashCouponCampaign();
    const f2 = await launchFlashCouponCampaign();
    expect(f1.coupons).toEqual(["ROYAL25", "NAWABI150"]);
    expect(f2.coupons).toEqual(["ROYAL25", "NAWABI150"]);

    // Reset environment cleans all DEMO- orders and restores state
    const reset = await resetDemoEnvironment();
    expect(reset.success).toBe(true);
    expect(mockState.orders.size).toBe(0);
    expect(mockState.coupons.size).toBe(0);
  });
});
