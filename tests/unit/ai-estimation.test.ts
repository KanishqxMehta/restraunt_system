import { describe, expect, it } from "vitest";
import {
  calculateHeuristicPrep,
  predictKitchenPrepTime,
  type OrderItemPrepInput,
  type OutletPrepInfo,
  type KitchenLoadSnapshot,
} from "@/features/orders/ai-estimation-logic";

describe("AI & Heuristic Prep-Time Estimation", () => {
  const sampleOutlet: OutletPrepInfo = {
    id: "outlet-kondapur",
    name: "Kondapur",
    minimumPrepMinutes: 25,
    packingMinutes: 5,
  };

  const sampleItems: OrderItemPrepInput[] = [
    {
      name: "Chicken dum biryani",
      portionName: "Regular",
      quantity: 1,
      prepMinutes: 20,
      isVeg: false,
    },
  ];

  const cleanKitchen: KitchenLoadSnapshot = {
    activeTicketCount: 0,
    activeItemCount: 0,
    activeOrderNumbers: [],
  };

  const busyKitchen: KitchenLoadSnapshot = {
    activeTicketCount: 4,
    activeItemCount: 9,
    activeOrderNumbers: ["WEB-1", "WEB-2", "WEB-3", "WEB-4"],
  };

  it("calculates base prep with zero queue delay on clean kitchen", () => {
    const result = calculateHeuristicPrep(sampleItems, sampleOutlet, cleanKitchen);
    expect(result.minutes).toBe(20);
    expect(result.explanation).toContain("Standard line preparation");
  });

  it("scales queue delay when kitchen has multiple active tickets", () => {
    const result = calculateHeuristicPrep(sampleItems, sampleOutlet, busyKitchen);
    // 20 base + 0 buffer + 4 * 3 (12m queue delay) = 32m
    expect(result.minutes).toBe(32);
    expect(result.explanation).toContain("Queue buffer applied (4 active tickets");
  });

  it("enforces rule: promised time is HIGHER of AI estimate and outlet minimum", async () => {
    // Single item base 10m on clean kitchen -> estimate = 10m
    const quickItem: OrderItemPrepInput[] = [
      {
        name: "Double ka meetha",
        portionName: "Regular",
        quantity: 1,
        prepMinutes: 10,
        isVeg: true,
      },
    ];

    const result = await predictKitchenPrepTime(quickItem, sampleOutlet, cleanKitchen);
    expect(result.aiEstimatedMinutes).toBe(10);
    // Even though AI estimate is 10m, outlet minimum is 25m!
    // Promised = max(10, 25) + 5 (packing) = 30m!
    expect(result.promisedMinutes).toBe(30);
  });

  it("allows higher AI estimates to extend the promised time under heavy queue", async () => {
    // 3 biryanis + 4 tickets in queue
    const heavyOrder: OrderItemPrepInput[] = [
      {
        name: "Chicken dum biryani",
        portionName: "Family pack",
        quantity: 3,
        prepMinutes: 25,
        isVeg: false,
      },
    ];

    const result = await predictKitchenPrepTime(heavyOrder, sampleOutlet, busyKitchen);
    // Heuristic: 25 base + 4 quantity buffer + 12 queue delay = 41m
    expect(result.aiEstimatedMinutes).toBeGreaterThanOrEqual(40);
    // Promised = max(41, 25) + 5 = 46m
    expect(result.promisedMinutes).toBe(result.aiEstimatedMinutes + 5);
  });

  it("gracefully falls back when GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const result = await predictKitchenPrepTime(sampleItems, sampleOutlet, busyKitchen);
      expect(result.estimateSource).toBe("HEURISTIC_LOAD");
      expect(result.promisedMinutes).toBeGreaterThanOrEqual(30);
      expect(result.explanation).toBeTruthy();
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
