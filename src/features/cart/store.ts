import { z } from "zod";
import {
  cartLineSchema,
  lineKey,
  type CartLine,
} from "@/features/checkout/validation";
import {
  locationSchema,
  type Location,
} from "@/features/outlets/serviceability";

const stateSchema = z.object({
  outletId: z.string().nullable(),
  location: locationSchema.nullable(),
  lines: z.array(cartLineSchema).max(30),
});
export type CartState = z.infer<typeof stateSchema>;
export const EMPTY_CART: CartState = {
  outletId: null,
  location: null,
  lines: [],
};

export function createCartStore(userId: string) {
  const key = `restaurant-system:cart:${userId}`;
  let state = EMPTY_CART;
  if (typeof window !== "undefined") {
    try {
      const parsed = stateSchema.safeParse(
        JSON.parse(sessionStorage.getItem(key) ?? "null"),
      );
      if (parsed.success && parsed.data.outletId && parsed.data.location)
        state = parsed.data;
    } catch {
      /* Storage may be unavailable; in-memory ordering still works. */
    }
  }
  const listeners = new Set<() => void>();
  function update(next: CartState) {
    state = next;
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* Keep the current tab usable if storage is full or disabled. */
    }
    listeners.forEach((listener) => listener());
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    selectOutlet(location: Location, outletId: string) {
      update({
        location,
        outletId,
        lines: state.outletId === outletId ? state.lines : [],
      });
    },
    addLine(line: CartLine) {
      const existing = state.lines.find(
        (entry) => lineKey(entry) === lineKey(line),
      );
      const lines = existing
        ? state.lines.map((entry) =>
            entry === existing
              ? {
                  ...entry,
                  quantity: Math.min(20, entry.quantity + line.quantity),
                }
              : entry,
          )
        : [...state.lines, line];
      update({ ...state, lines });
    },
    setQuantity(key: string, quantity: number) {
      update({
        ...state,
        lines: state.lines
          .map((line) =>
            lineKey(line) === key
              ? { ...line, quantity: Math.min(20, quantity) }
              : line,
          )
          .filter((line) => line.quantity > 0),
      });
    },
    clear() {
      update({ ...state, lines: [] });
    },
  };
}
