"use client";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createCartStore, EMPTY_CART } from "./store";
const CartContext = createContext<ReturnType<typeof createCartStore> | null>(
  null,
);
const subscribeHydration = () => () => {};
export function CartProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [store] = useState(() => createCartStore(userId));
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}
export function useCart() {
  const store = useContext(CartContext);
  if (!store)
    throw new Error("Customer cart must be used within CartProvider.");
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => EMPTY_CART,
  );
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return { ...store, ...state, hydrated };
}
