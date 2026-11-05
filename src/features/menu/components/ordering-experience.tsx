"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin, Search, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/features/cart/context";
import { CartPanel } from "@/features/cart/components/cart-panel";
import { previewCart } from "@/features/cart/preview";
import { OutletPicker } from "@/features/outlets/components/outlet-picker";
import { useCustomerMenu } from "../use-customer-menu";
import type { CustomerMenuItem } from "../types";
import { ItemConfiguration } from "./item-configuration";
import { MenuCard } from "./menu-card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/classes";

export function OrderingExperience() {
  const cart = useCart();
  const { menu, error, loading, retry } = useCustomerMenu(cart.outletId);
  const [changeOutlet, setChangeOutlet] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [configuredItem, setConfiguredItem] = useState<CustomerMenuItem | null>(
    null,
  );
  if (!cart.hydrated) return <p role="status">Loading your basket…</p>;
  const selecting = !cart.outletId || changeOutlet;
  const categories = [
    "All",
    ...new Set(menu?.items.map((item) => item.category) ?? []),
  ];
  const items =
    menu?.items.filter(
      (item) =>
        (category === "All" || item.category === category) &&
        item.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const subtotal = previewCart(cart.lines, menu?.items ?? []).reduce(
    (sum, line) => sum + line.quantity * line.unitPricePaise,
    0,
  );
  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-8 overflow-hidden rounded-[2rem] bg-[#173e37] text-white">
        <div className="grid sm:grid-cols-[1.2fr_0.8fr]">
          <div className="px-7 py-10 sm:px-10 sm:py-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              From our kitchen. To your table.
            </p>
            <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Hyderabad,
              <br />
              served with heart.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-stone-200">
              Slow dum biryani. Familiar favourites.
              <br />
              Order direct, and make it your own.
            </p>
          </div>
          <div className="relative hidden min-h-64 sm:block">
            <Image
              src="/menu/chicken-biryani.jpg"
              alt="Hyderabadi chicken biryani with fragrant rice and spices"
              fill
              sizes="(min-width: 1024px) 450px, 40vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#173e37] to-transparent" />
          </div>
        </div>
      </header>
      {selecting ? (
        <>
          <OutletPicker onSelected={() => setChangeOutlet(false)} />
          {cart.outletId && (
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setChangeOutlet(false)}
            >
              Keep current outlet
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-emerald-900" />
              <div>
                <p className="text-xs text-stone-500">Ordering from</p>
                <h2 className="font-semibold">
                  {menu?.outlet.name ?? "Your selected outlet"}
                </h2>
                {menu && (
                  <p className="mt-1 text-xs text-stone-500">
                    FSSAI {menu.outlet.fssaiLicense} · Provisional prep{" "}
                    {menu.outlet.minimumPrepMinutes +
                      menu.outlet.packingMinutes}{" "}
                    min
                  </p>
                )}
              </div>
            </div>
            <Button variant="secondary" onClick={() => setChangeOutlet(true)}>
              Change outlet
            </Button>
          </div>
          {loading && (
            <div
              role="status"
              className="h-64 animate-pulse rounded-3xl bg-stone-200 p-6 text-stone-600"
            >
              Loading today&apos;s menu…
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6"
            >
              <p className="mb-4 text-sm text-red-800">{error}</p>
              <Button onClick={retry}>Try again</Button>
            </div>
          )}
          {menu && (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
              <section aria-label="Menu">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Find your favourite
                  </h2>
                  <span className="text-xs text-stone-500">
                    All prices include 5% GST
                  </span>
                </div>
                {!menu.isOpen && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
                  >
                    This outlet is currently closed. Choose another outlet to
                    order.
                  </p>
                )}
                <label className="mb-5 flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4">
                  <Search
                    className="h-4 w-4 text-stone-400"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Search dishes</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search dishes"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <div
                  className="mb-6 flex flex-wrap gap-2"
                  aria-label="Menu categories"
                >
                  {categories.map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={category === value}
                      onClick={() => setCategory(value)}
                      className={cn(
                        "min-h-10 rounded-full border px-4 text-sm font-medium",
                        category === value
                          ? "border-emerald-950 bg-emerald-950 text-white"
                          : "border-stone-200 bg-white text-stone-600",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-sm text-stone-500">
                    No dishes match your search. Try another dish or category.
                  </p>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {items.map((item) => (
                      <MenuCard
                        key={item.id}
                        item={item}
                        isOpen={menu.isOpen}
                        onConfigure={setConfiguredItem}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-6 text-xs leading-6 text-stone-400">
                  Photos are representative.{" "}
                  <Link
                    href="/photo-credits"
                    className="underline underline-offset-2"
                  >
                    Photo credits
                  </Link>
                  . Tell us about food allergies before placing your order.
                </p>
              </section>
              <aside className="hidden lg:sticky lg:top-6 lg:block">
                <CartPanel menu={menu} />
              </aside>
              {cart.lines.length > 0 && (
                <Link
                  href="/checkout"
                  className="fixed inset-x-4 bottom-4 z-20 flex min-h-16 items-center gap-3 rounded-2xl bg-emerald-950 px-5 text-sm font-semibold text-white shadow-xl lg:hidden"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>View basket · {formatMoney(subtotal)}</span>
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Link>
              )}
            </div>
          )}
        </>
      )}
      {configuredItem && (
        <ItemConfiguration
          item={configuredItem}
          onClose={() => setConfiguredItem(null)}
        />
      )}
    </div>
  );
}
