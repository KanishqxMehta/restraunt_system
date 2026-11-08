"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  MapPin,
  Search,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Clock,
  ShieldCheck,
  Flame,
  UtensilsCrossed,
} from "lucide-react";
import { useCart } from "@/features/cart/context";
import { CartPanel } from "@/features/cart/components/cart-panel";
import { previewCart } from "@/features/cart/preview";
import { OutletPicker } from "@/features/outlets/components/outlet-picker";
import { useCustomerMenu } from "../use-customer-menu";
import type { CustomerMenuItem } from "../types";
import { ItemConfiguration } from "./item-configuration";
import { MenuCard } from "./menu-card";
import { ReorderSuggestions } from "./reorder-suggestions";
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
    <div className="pb-24 lg:pb-0">
      {/* Luxury Bento Hero Banner */}
      <header className="mb-8 overflow-hidden rounded-[2.25rem] border border-[#1d4c41] bg-gradient-to-br from-[#0b2922] via-[#123d33] to-[#2b1235] text-white shadow-[0_16px_48px_rgba(15,53,45,0.16)]">
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative z-10 flex flex-col justify-between px-6 py-9 sm:px-10 sm:py-11">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f4d6a9]/30 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f4d6a9] backdrop-blur-xs">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                From our kitchen · To your table
              </div>
              <h1 className="font-display max-w-lg text-4xl font-bold leading-[1.12] tracking-tight text-[#fffdfa] sm:text-5xl">
                Hyderabad,
                <br />
                <span className="text-[#f4d6a9]">served with heart.</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-stone-200/90 sm:text-base">
                Slow-cooked Kache Gosht & Zafrani Chicken Dum Biryani, rich
                Haleem, and heirloom accompaniments. Order direct with zero
                aggregator commissions.
              </p>
            </div>

            {/* Direct Order Perks Strip */}
            <div className="mt-7 flex flex-wrap items-center gap-3 pt-4 border-t border-white/15 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 font-semibold text-[#f4d6a9]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Code DIRECT10 · 10% Off
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-stone-200">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-[#f4d6a9]"
                  aria-hidden="true"
                />
                5% Inclusive GST
              </span>
              <Link
                href="/party-orders"
                className="inline-flex items-center gap-1 rounded-full border border-[#f4d6a9]/35 bg-[#3b1747]/70 px-3.5 py-1 font-bold text-[#f4d6a9] transition hover:bg-[#3b1747]"
              >
                Hosting 15+ guests? Bulk Handis →
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-72 lg:block">
            <Image
              src="/menu/chicken-biryani.jpg"
              alt="Hyderabadi chicken biryani with fragrant rice and spices"
              fill
              sizes="(min-width: 1024px) 450px, 40vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#113930] via-[#113930]/35 to-transparent" />
            <div className="absolute right-5 bottom-5 max-w-xs rounded-2xl border border-white/20 bg-black/55 p-3.5 text-xs text-stone-100 backdrop-blur-md">
              <p className="font-display font-bold text-[#f4d6a9]">
                Sealed in Earthen Handis
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-stone-200">
                Every order is finished over slow charcoal dum and dispatched
                straight from your neighbourhood kitchen.
              </p>
            </div>
          </div>
        </div>
      </header>

      {selecting ? (
        <div>
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
        </div>
      ) : (
        <>
          {/* Active Outlet Command Bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#dfd4c2] bg-[#fffdfa] p-4 shadow-xs sm:px-6 sm:py-4">
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]"
              >
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
                    Ordering from
                  </p>
                  {menu && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        menu.isOpen
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          menu.isOpen ? "bg-emerald-600" : "bg-amber-600",
                        )}
                      />
                      {menu.isOpen ? "Kitchen Open" : "Closed"}
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-[#0f352d]">
                  {menu?.outlet.name ?? "Your selected outlet"}
                </h2>
                {menu && (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#615a4f]">
                    <span>FSSAI {menu.outlet.fssaiLicense}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0f352d]">
                      <Clock className="h-3.5 w-3.5 text-[#c99b53]" aria-hidden="true" />
                      Provisional prep{" "}
                      {menu.outlet.minimumPrepMinutes +
                        menu.outlet.packingMinutes}{" "}
                      min
                    </span>
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
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-72 animate-pulse rounded-3xl border border-[#e5dbc9] bg-[#f2ebe0]/70 p-6 text-sm font-medium text-[#655c50]"
                >
                  {n === 1 ? "Loading today's menu…" : ""}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-3xl border border-red-200 bg-red-50 p-6"
            >
              <p className="mb-4 text-sm font-medium text-red-800">{error}</p>
              <Button onClick={retry}>Try again</Button>
            </div>
          )}

          {menu && (
            <>
              {cart.outletId && (
                <ReorderSuggestions
                  outletId={cart.outletId}
                  allItems={menu.items}
                  onConfigure={setConfiguredItem}
                />
              )}

              <div
                className={cn(
                  "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_350px]",
                  cart.lines.length > 0 && "pb-28 lg:pb-0",
                )}
              >
                <section aria-label="Menu">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
                        Curated Dastarkhwan
                      </span>
                      <h2 className="font-display mt-0.5 text-2xl font-bold tracking-tight text-[#0f352d] sm:text-3xl">
                        Find your favourite
                      </h2>
                    </div>
                    <span className="rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-3.5 py-1 text-xs font-bold text-[#4a1d5a]">
                      All prices include 5% GST
                    </span>
                  </div>

                  {!menu.isOpen && (
                    <p
                      role="alert"
                      className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950"
                    >
                      This outlet is currently closed. Choose another outlet to
                      order.
                    </p>
                  )}

                  {/* Search & Category Bar */}
                  <div className="mb-6 rounded-2xl border border-[#dfd4c2] bg-[#fffdfa] p-3.5 shadow-2xs">
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e3d8c6] bg-[#faf7f2] px-4 transition focus-within:border-[#0f352d] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#0f352d]/10">
                      <Search
                        className="h-4 w-4 text-[#7a7062]"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Search dishes</span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search biryanis, haleem, salan or desserts…"
                        className="w-full bg-transparent text-sm font-medium text-[#1f1c18] outline-none placeholder:font-normal placeholder:text-[#8f8474]"
                      />
                    </label>

                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      aria-label="Menu categories"
                    >
                      {categories.map((value) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={category === value}
                          onClick={() => setCategory(value)}
                          className={cn(
                            "min-h-9 rounded-full border px-4 text-xs font-bold tracking-wide transition active:scale-95",
                            category === value
                              ? "border-[#0f352d] bg-[#0f352d] text-white shadow-2xs"
                              : "border-[#dfd4c2] bg-[#faf7f2] text-[#554e44] hover:border-[#4a1d5a] hover:bg-white hover:text-[#4a1d5a]",
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#d6c9b6] bg-[#fffdfa] p-12 text-center shadow-xs">
                      <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ded2bf] bg-[#faf7f2] text-[#c99b53]">
                        <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#0f352d]">
                        No dishes match &ldquo;{search || category}&rdquo;
                      </h3>
                      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[#5f574c]">
                        We couldn&apos;t find any authentic Hyderabadi specialties matching your current selection. Try resetting filters to view all fresh preparations.
                      </p>
                      {(search || category !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setCategory("All");
                          }}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f352d] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#15463b] transition"
                        >
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>
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

                  <p className="mt-7 text-xs leading-6 text-[#787064]">
                    Photos are representative.{" "}
                    <Link
                      href="/photo-credits"
                      className="font-semibold text-[#4a1d5a] underline underline-offset-2"
                    >
                      Photo credits
                    </Link>
                    . Tell us about food allergies before placing your order.
                  </p>
                </section>

                <aside className="hidden lg:sticky lg:top-20 lg:block">
                  <CartPanel menu={menu} />
                </aside>

                {cart.lines.length > 0 && (
                  <Link
                    href="/checkout"
                    className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-30 flex min-h-15 items-center gap-3 rounded-2xl border border-[#f4d6a9]/30 bg-gradient-to-r from-[#0f352d] to-[#1a4e42] px-5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(15,53,45,0.4)] transition hover:from-[#144339] hover:to-[#0f352d] active:scale-[0.99] lg:hidden"
                  >
                    <ShoppingBag
                      className="h-5 w-5 text-[#f4d6a9]"
                      aria-hidden="true"
                    />
                    <span>
                      View basket ({cart.lines.reduce((s, l) => s + l.quantity, 0)}{" "}
                      {cart.lines.reduce((s, l) => s + l.quantity, 0) === 1 ? "item" : "items"}) · {formatMoney(subtotal)}
                    </span>
                    <ArrowRight className="ml-auto h-5 w-5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </>
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
