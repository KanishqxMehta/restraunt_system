import { describe, expect, it, vi } from "vitest";
import {
  demoAccounts,
  getOutletStaffCredentials,
} from "@/features/auth/demo-accounts";
import { outlets } from "../../prisma/seed-data";
import type { Viewer } from "@/features/auth/policy";
import { advanceKitchenStage } from "@/features/orders/kitchen-service";

// Mock server-only so service can be imported in Vitest
vi.mock("server-only", () => ({}));

// Mock notifications dispatcher
vi.mock("@/features/notifications/dispatcher", () => ({
  dispatchOrderNotifications: vi.fn().mockResolvedValue(undefined),
}));

// Mock database for advanceKitchenStage
const mockOrder = {
  id: "test-order-1",
  status: "NEW",
  paymentStatus: "PAID",
  outletId: "outlet-madhapur",
  isCatering: false,
  cateringStatus: null,
};

vi.mock("@/server/db/transaction", () => ({
  serializable: async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      order: {
        findFirst: async () => mockOrder,
        update: async ({ data }: { data: { status: string } }) => {
          mockOrder.status = data.status;
          return { id: mockOrder.id, status: data.status };
        },
      },
    };
    return await fn(tx);
  },
}));

describe("Admin Multi-Outlet Credentials & Master KDS Access", () => {
  it("includes three distinct demo customers in demo accounts", () => {
    const customers = demoAccounts.filter((a) => a.role === "CUSTOMER");
    expect(customers.length).toBeGreaterThanOrEqual(3);

    const emails = customers.map((c) => c.email);
    expect(emails).toContain("customer@demo.example");
    expect(emails).toContain("customer2@demo.example");
    expect(emails).toContain("customer3@demo.example");
  });

  it("generates valid, consistent credentials for all 17 fleet outlets", () => {
    expect(outlets.length).toBe(17);

    const generatedEmails = new Set<string>();
    for (const outlet of outlets) {
      const creds = getOutletStaffCredentials(outlet);
      expect(creds.outletId).toBe(outlet.id);
      expect(creds.staffName).toContain("Kitchen Staff");
      expect(creds.password).toBe("DemoAccess!2026");
      expect(creds.role).toBe("KITCHEN_STAFF");
      expect(creds.email).toMatch(/^[a-z0-9-]+@demo\.example$/);
      expect(creds.pin).toMatch(/^\d{4}$/);

      // Unique emails across all 17 outlets
      expect(generatedEmails.has(creds.email)).toBe(false);
      generatedEmails.add(creds.email);
    }

    expect(generatedEmails.size).toBe(17);
  });

  it("allows CENTRAL_ADMIN to advance order stage on KDS across any outlet", async () => {
    const adminViewer: Viewer = {
      id: "demo-admin",
      name: "Central Admin",
      email: "admin@demo.example",
      role: "CENTRAL_ADMIN",
      outletIds: [],
    };

    mockOrder.status = "NEW";
    const res = await advanceKitchenStage(adminViewer, "test-order-1", "NEW");
    expect(res.status).toBe("PREPARING");
    expect(mockOrder.status).toBe("PREPARING");
  });

  it("blocks non-staff non-admin roles (e.g. CUSTOMER) from advancing kitchen tickets", async () => {
    const customerViewer: Viewer = {
      id: "demo-customer",
      name: "Demo Customer",
      email: "customer@demo.example",
      role: "CUSTOMER",
      outletIds: [],
    };

    await expect(
      advanceKitchenStage(customerViewer, "test-order-1", "PREPARING"),
    ).rejects.toThrow("You do not have access to this area.");
  });
});
