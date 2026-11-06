import { describe, it, expect } from "vitest";
import {
  createOutletSchema,
  updateOutletSchema,
  fssaiLicenseRegex,
} from "@/features/outlets/validation";

describe("Outlets CMS Validation & Business Rules", () => {
  const validOutlet = {
    name: "Madhapur Cloud Kitchen",
    city: "Hyderabad",
    address: "Plot 42, Hitec City Phase 2, Madhapur, Hyderabad - 500081",
    latitude: 17.4485,
    longitude: 78.3742,
    deliveryRadiusKm: 8.5,
    fssaiLicense: "13624014000399",
    isCloudKitchen: true,
    minimumPrepMinutes: 20,
    packingMinutes: 5,
    kitchenCapacity: 3,
    opensAtMinute: 660,
    closesAtMinute: 1380,
  };

  it("accepts valid outlet payload", () => {
    const result = createOutletSchema.safeParse(validOutlet);
    expect(result.success).toBe(true);
  });

  it("enforces 14-digit Indian FSSAI licence requirement", () => {
    expect(fssaiLicenseRegex.test("13624014000399")).toBe(true);
    expect(fssaiLicenseRegex.test("12345")).toBe(false);
    expect(fssaiLicenseRegex.test("FSSAI1234567890")).toBe(false);

    const invalidFssai = { ...validOutlet, fssaiLicense: "999" };
    const result = createOutletSchema.safeParse(invalidFssai);
    expect(result.success).toBe(false);
  });

  it("enforces opening time must be earlier than closing time", () => {
    const invalidTimes = {
      ...validOutlet,
      opensAtMinute: 1200,
      closesAtMinute: 600,
    };
    const result = createOutletSchema.safeParse(invalidTimes);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Opening time must be earlier than closing time",
      );
    }
  });

  it("enforces reasonable delivery radius bounds", () => {
    const tooSmall = { ...validOutlet, deliveryRadiusKm: 0.1 };
    expect(createOutletSchema.safeParse(tooSmall).success).toBe(false);

    const tooLarge = { ...validOutlet, deliveryRadiusKm: 100 };
    expect(createOutletSchema.safeParse(tooLarge).success).toBe(false);

    const reasonable = { ...validOutlet, deliveryRadiusKm: 12.0 };
    expect(createOutletSchema.safeParse(reasonable).success).toBe(true);
  });

  it("allows partial updates via updateOutletSchema", () => {
    const partialUpdate = {
      isActive: false,
      deliveryRadiusKm: 10.0,
      minimumPrepMinutes: 25,
    };
    const result = updateOutletSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
      expect(result.data.deliveryRadiusKm).toBe(10.0);
    }
  });

  it("rejects invalid time ordering on updateOutletSchema", () => {
    const badTimeUpdate = {
      opensAtMinute: 1300,
      closesAtMinute: 800,
    };
    const result = updateOutletSchema.safeParse(badTimeUpdate);
    expect(result.success).toBe(false);
  });
});
