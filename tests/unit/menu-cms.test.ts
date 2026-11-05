import { describe, expect, it } from "vitest";
import {
  createMenuItemSchema,
  pauseItemStockSchema,
  cityPriceInputSchema,
} from "@/features/menu/validation";
import {
  isItemInTimeWindow,
  formatTimeWindow,
  parseTimeToMinute,
  formatMinuteToTime,
} from "@/features/menu/time-windows";
import { priceLines, type PricingItem } from "@/features/checkout/pricing";

describe("Central Menu CMS validation", () => {
  const validDish = {
    name: "Mutton Haleem",
    category: "Sides",
    description: "Slow-cooked mutton with lentils and wheat porridge.",
    imageUrl: "/menu/haleem.jpg",
    isVeg: false,
    spiceLevel: 2,
    allergens: ["Milk", "Gluten"],
    basePrepMinutes: 10,
    prepStation: "HALEEM",
    batchCapacity: 4,
    availableFromMinute: 1020, // 17:00
    availableToMinute: 1410, // 23:30
    portions: [
      {
        name: "Regular",
        prices: [{ city: "Hyderabad", pricePaise: 35000 }],
      },
    ],
    addons: [],
  };

  it("accepts a well-formed dish payload with portions and city prices", () => {
    const parsed = createMenuItemSchema.parse(validDish);
    expect(parsed.name).toBe("Mutton Haleem");
    expect(parsed.availableFromMinute).toBe(1020);
    expect(parsed.portions[0].prices[0].pricePaise).toBe(35000);
  });

  it("rejects invalid prices and missing portions", () => {
    expect(
      createMenuItemSchema.safeParse({
        ...validDish,
        portions: [],
      }).success,
    ).toBe(false);

    expect(
      cityPriceInputSchema.safeParse({
        city: "Hyderabad",
        pricePaise: -500,
      }).success,
    ).toBe(false);

    expect(
      cityPriceInputSchema.safeParse({
        city: "Hyderabad",
        pricePaise: 350.5, // non-integer paise
      }).success,
    ).toBe(false);
  });

  it("rejects minute offsets outside the 0-1440 range", () => {
    expect(
      createMenuItemSchema.safeParse({
        ...validDish,
        availableFromMinute: 1500,
      }).success,
    ).toBe(false);

    expect(
      createMenuItemSchema.safeParse({
        ...validDish,
        availableToMinute: -1,
      }).success,
    ).toBe(false);
  });

  it("validates pauseItemStockSchema for outlet pause actions", () => {
    expect(
      pauseItemStockSchema.safeParse({
        itemId: "item-123",
        outletId: "outlet-kondapur",
        isAvailable: false,
      }).success,
    ).toBe(true);

    expect(
      pauseItemStockSchema.safeParse({
        itemId: "",
        outletId: "outlet-kondapur",
        isAvailable: true,
      }).success,
    ).toBe(false);
  });
});

describe("Time-based menu service window logic", () => {
  it("treats null time window as available all day", () => {
    const testDate = new Date("2026-11-05T03:30:00Z"); // 09:00 IST
    expect(isItemInTimeWindow(null, null, testDate)).toBe(true);
    expect(isItemInTimeWindow(undefined, undefined, testDate)).toBe(true);
    expect(formatTimeWindow(null, null)).toBe("All day");
  });

  it("correctly identifies active and inactive windows in Asia/Kolkata", () => {
    // 17:00 to 23:30 (1020 to 1410 min)
    const fromMinute = 1020;
    const toMinute = 1410;

    // 18:30 IST = 13:00 UTC
    const insideTime = new Date("2026-11-05T13:00:00Z");
    expect(isItemInTimeWindow(fromMinute, toMinute, insideTime)).toBe(true);

    // 14:00 IST = 08:30 UTC (before 17:00)
    const outsideTime = new Date("2026-11-05T08:30:00Z");
    expect(isItemInTimeWindow(fromMinute, toMinute, outsideTime)).toBe(false);
  });

  it("handles overnight windows crossing midnight", () => {
    // 22:00 to 02:00 (1320 to 120 min)
    const fromMinute = 1320;
    const toMinute = 120;

    // 23:00 IST = 17:30 UTC
    const nightTime = new Date("2026-11-05T17:30:00Z");
    expect(isItemInTimeWindow(fromMinute, toMinute, nightTime)).toBe(true);

    // 01:00 IST = 19:30 UTC
    const earlyMorning = new Date("2026-11-05T19:30:00Z");
    expect(isItemInTimeWindow(fromMinute, toMinute, earlyMorning)).toBe(true);

    // 15:00 IST = 09:30 UTC (outside)
    const afternoon = new Date("2026-11-05T09:30:00Z");
    expect(isItemInTimeWindow(fromMinute, toMinute, afternoon)).toBe(false);
  });

  it("parses HH:MM strings to minutes and formats back", () => {
    expect(parseTimeToMinute("17:00")).toBe(1020);
    expect(parseTimeToMinute("23:30")).toBe(1410);
    expect(parseTimeToMinute("00:00")).toBe(0);
    expect(parseTimeToMinute("invalid")).toBe(null);

    expect(formatMinuteToTime(1020)).toBe("17:00");
    expect(formatMinuteToTime(1410)).toBe("23:30");
    expect(formatTimeWindow(1020, 1410)).toBe("17:00 – 23:30");
  });
});

describe("Pricing with Time-Based restrictions", () => {
  const itemWithWindow: PricingItem = {
    id: "haleem-dish",
    name: "Mutton Haleem",
    isVeg: false,
    allergens: ["Milk", "Gluten"],
    basePrepMinutes: 10,
    availableFromMinute: 1020, // 17:00 IST
    availableToMinute: 1410, // 23:30 IST
    availability: [{ isAvailable: true }],
    portions: [
      {
        id: "haleem-regular",
        name: "Regular",
        prepMinutesOverride: null,
        prices: [{ pricePaise: 35000 }],
      },
    ],
    addons: [],
  };

  const line = [{ portionId: "haleem-regular", addonIds: [], quantity: 1 }];

  it("allows pricing when the current time is inside service hours", () => {
    // 19:00 IST = 13:30 UTC
    const evening = new Date("2026-11-05T13:30:00Z");
    const priced = priceLines(line, [itemWithWindow], evening);
    expect(priced).toHaveLength(1);
    expect(priced[0].unitPricePaise).toBe(35000);
  });

  it("rejects pricing with 409 when current time is outside service hours", () => {
    // 12:00 IST = 06:30 UTC
    const noon = new Date("2026-11-05T06:30:00Z");
    expect(() => priceLines(line, [itemWithWindow], noon)).toThrowError(
      /designated service hours/,
    );
  });
});
