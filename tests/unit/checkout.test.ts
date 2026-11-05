import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  priceLines,
  type PricingItem,
} from "@/features/checkout/pricing";
import { lineKey, quoteInputSchema } from "@/features/checkout/validation";
const item: PricingItem = {
  id: "dish",
  name: "Biryani",
  isVeg: false,
  allergens: ["Milk"],
  basePrepMinutes: 20,
  availability: [{ isAvailable: true }],
  portions: [
    {
      id: "regular",
      name: "Regular",
      prepMinutesOverride: null,
      prices: [{ pricePaise: 35000 }],
    },
  ],
  addons: [
    {
      id: "extra",
      name: "Raita",
      pricePaise: 4000,
      extraPrepMinutes: 1,
      allergens: ["Milk", "Sesame"],
    },
  ],
};
const input = {
  outletId: "outlet",
  location: { latitude: 17.4, longitude: 78.3 },
  lines: [{ portionId: "regular", addonIds: [], quantity: 1 }],
};
describe("authoritative checkout pricing", () => {
  it("prices portions and add-ons per quantity and snapshots allergens", () => {
    const lines = priceLines(
      [{ portionId: "regular", addonIds: ["extra"], quantity: 2 }],
      [item],
    );
    expect(lines[0].unitPricePaise).toBe(39000);
    expect(lines[0].allergens).toEqual(["Milk", "Sesame"]);
    expect(calculateTotals(lines).totalPaise).toBe(78000);
  });
  it("rejects unavailable dishes, absent city prices, and foreign add-ons", () => {
    expect(() =>
      priceLines(input.lines, [
        { ...item, availability: [{ isAvailable: false }] },
      ]),
    ).toThrow();
    expect(() =>
      priceLines(input.lines, [
        { ...item, portions: [{ ...item.portions[0], prices: [] }] },
      ]),
    ).toThrow();
    expect(() =>
      priceLines([{ ...input.lines[0], addonIds: ["foreign"] }], [item]),
    ).toThrow();
  });
  it("extracts inclusive GST without adding a second tax", () => {
    const result = calculateTotals([{ quantity: 1, unitPricePaise: 10500 }]);
    expect(result.totalPaise).toBe(10500);
    expect(result.includedTaxPaise).toBe(500);
    expect(result.cgstPaise + result.sgstPaise).toBe(500);
  });
  it("caps percentage discounts and calculates tax after the discount", () => {
    const result = calculateTotals([{ quantity: 1, unitPricePaise: 118000 }], {
      discountType: "PERCENT",
      value: 10,
      minOrderPaise: 30000,
      maxDiscountPaise: 10000,
    });
    expect(result.discountPaise).toBe(10000);
    expect(result.totalPaise).toBe(108000);
    expect(result.includedTaxPaise).toBe(Math.round((108000 * 5) / 105));
  });
  it("caps flat discounts at subtotal and checks minimum spend", () => {
    expect(
      calculateTotals([{ quantity: 1, unitPricePaise: 100 }], {
        discountType: "FLAT",
        value: 1000,
        minOrderPaise: 0,
        maxDiscountPaise: null,
      }).totalPaise,
    ).toBe(0);
    expect(() =>
      calculateTotals([{ quantity: 1, unitPricePaise: 100 }], {
        discountType: "PERCENT",
        value: 10,
        minOrderPaise: 200,
        maxDiscountPaise: null,
      }),
    ).toThrow();
  });
  it("rejects browser-supplied prices and invalid quantities", () => {
    expect(
      quoteInputSchema.safeParse({ ...input, totalPaise: 1 }).success,
    ).toBe(false);
    for (const quantity of [-1, 0, 1.5, 21])
      expect(
        quoteInputSchema.safeParse({
          ...input,
          lines: [{ ...input.lines[0], quantity }],
        }).success,
      ).toBe(false);
  });
  it("normalizes coupon codes and rejects duplicate cart lines/add-ons", () => {
    expect(
      quoteInputSchema.parse({ ...input, couponCode: " direct10 " }).couponCode,
    ).toBe("DIRECT10");
    expect(
      quoteInputSchema.safeParse({
        ...input,
        lines: [input.lines[0], input.lines[0]],
      }).success,
    ).toBe(false);
    expect(
      quoteInputSchema.safeParse({
        ...input,
        lines: [{ ...input.lines[0], addonIds: ["extra", "extra"] }],
      }).success,
    ).toBe(false);
  });
  it("uses stable line keys for add-on order", () => {
    expect(lineKey({ portionId: "a", addonIds: ["2", "1"] })).toBe(
      lineKey({ portionId: "a", addonIds: ["1", "2"] }),
    );
  });
});
