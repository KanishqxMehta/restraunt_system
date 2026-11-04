import { describe, expect, it } from "vitest";
import { orderScope, requireRole, type Viewer } from "@/features/auth/policy";
import { homeForRole } from "@/features/auth/roles";

const customer: Viewer = {
  id: "customer-a",
  name: "Test",
  email: "customer@test.example",
  role: "CUSTOMER",
  outletIds: [],
};
describe("server authorization", () => {
  it("restricts customers to their own orders", () => {
    expect(orderScope(customer)).toEqual({ customerId: "customer-a" });
  });
  it("restricts kitchen staff to assigned outlets", () => {
    expect(
      orderScope({
        ...customer,
        role: "KITCHEN_STAFF",
        outletIds: ["branch-a"],
      }),
    ).toEqual({ outletId: { in: ["branch-a"] } });
  });
  it("fails closed for unassigned kitchen staff", () => {
    expect(orderScope({ ...customer, role: "KITCHEN_STAFF" })).toEqual({
      outletId: { in: [] },
    });
  });
  it("allows central admins network-wide order access", () => {
    expect(orderScope({ ...customer, role: "CENTRAL_ADMIN" })).toEqual({});
  });
  it("denies customer access to kitchen and menu administration", () => {
    expect(() =>
      requireRole(customer, ["KITCHEN_STAFF", "CENTRAL_ADMIN"]),
    ).toThrow();
    expect(() => requireRole(customer, ["CENTRAL_ADMIN"])).toThrow();
  });
  it("denies kitchen staff menu administration", () => {
    expect(() =>
      requireRole({ ...customer, role: "KITCHEN_STAFF" }, ["CENTRAL_ADMIN"]),
    ).toThrow();
  });
  it("routes each role to its workspace", () => {
    expect(homeForRole("CUSTOMER")).toBe("/account");
    expect(homeForRole("KITCHEN_STAFF")).toBe("/kitchen");
    expect(homeForRole("CENTRAL_ADMIN")).toBe("/admin/menu");
  });
});
