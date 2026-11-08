import { afterEach, describe, expect, it, vi } from "vitest";
import { createCartStore } from "@/features/cart/store";
const line = { portionId: "regular", addonIds: [], quantity: 1 };
afterEach(() => vi.unstubAllGlobals());
describe("tab-scoped cart", () => {
  it("combines identical lines and removes zero quantities", () => {
    const store = createCartStore("unit");
    store.selectOutlet({ latitude: 0, longitude: 0 }, "outlet-a");
    store.addLine(line);
    store.addLine(line);
    expect(store.getSnapshot().lines[0].quantity).toBe(2);
    store.setQuantity("regular:", 0);
    expect(store.getSnapshot().lines).toEqual([]);
  });
  it("clears lines when the outlet changes", () => {
    const store = createCartStore("unit");
    store.selectOutlet({ latitude: 0, longitude: 0 }, "a");
    store.addLine(line);
    store.selectOutlet({ latitude: 1, longitude: 1 }, "b");
    expect(store.getSnapshot().lines).toEqual([]);
  });
  it("restores only the same user's validated cart and handles location objects with extra fields", () => {
    const memory = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    });
    const first = createCartStore("user-a");
    first.selectOutlet({ latitude: 0, longitude: 0 }, "a");
    first.addLine(line);
    expect(createCartStore("user-a").getSnapshot().lines).toHaveLength(1);
    expect(createCartStore("user-b").getSnapshot().lines).toEqual([]);
    memory.set("restaurant-system:cart:user-a", "broken");
    expect(createCartStore("user-a").getSnapshot().lines).toEqual([]);

    // Extra fields like 'address' should be stripped without failing safeParse
    memory.set(
      "restaurant-system:cart:user-a",
      JSON.stringify({
        outletId: "outlet-kondapur",
        location: { latitude: 17.46, longitude: 78.35, address: "Kondapur" },
        lines: [line],
      }),
    );
    const restored = createCartStore("user-a");
    expect(restored.getSnapshot().outletId).toBe("outlet-kondapur");
    expect(restored.getSnapshot().location).toEqual({ latitude: 17.46, longitude: 78.35 });
    expect(restored.getSnapshot().lines).toHaveLength(1);
  });

  it("supports setLines and reset operations", () => {
    const store = createCartStore("unit");
    store.selectOutlet({ latitude: 17.46, longitude: 78.35 }, "outlet-kondapur");
    store.setLines([line, { portionId: "portion-2", addonIds: [], quantity: 3 }]);
    expect(store.getSnapshot().lines).toHaveLength(2);
    expect(store.getSnapshot().lines[1].quantity).toBe(3);

    store.reset();
    expect(store.getSnapshot().outletId).toBeNull();
    expect(store.getSnapshot().lines).toEqual([]);
  });
});
