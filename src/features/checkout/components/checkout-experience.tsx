"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  TicketPercent,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/features/cart/context";
import { previewCart } from "@/features/cart/preview";
import { CartPanel } from "@/features/cart/components/cart-panel";
import { useCustomerMenu } from "@/features/menu/use-customer-menu";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AlertBanner, useAlert } from "@/components/ui/alert-toast";
import { ClientError, errorMessage, requestJson } from "@/lib/http-client";
import { quoteInputSchema, deliveryAddressSchema } from "../validation";
import type { CheckoutQuote } from "../types";
import type { AvailableCustomerCoupon } from "@/features/coupons/types";
import { PriceBreakdown } from "./price-breakdown";
import { PaymentMethodPicker } from "./payment-method";
import { cn } from "@/lib/classes";

export function CheckoutExperience({
  initialAvailableCoupons = [],
}: {
  initialAvailableCoupons?: AvailableCustomerCoupon[];
}) {
  const cart = useCart();
  const router = useRouter();
  const alert = useAlert();
  const { menu, error: menuError, retry } = useCustomerMenu(cart.outletId);
  const [address, setAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<
    AvailableCustomerCoupon[]
  >(initialAvailableCoupons);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [loyalty, setLoyalty] = useState<{
    pointsBalance: number;
    rupeeValue: number;
  } | null>(null);
  const [method, setMethod] = useState<"UPI" | "CARD">("UPI");
  const [quoteResult, setQuote] = useState<{
    key: string;
    quote: CheckoutQuote;
  } | null>(null);

  // Fetch customer loyalty balance and live available coupons
  useEffect(() => {
    fetch("/api/customer/loyalty")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.account) {
          setLoyalty({
            pointsBalance: data.account.pointsBalance,
            rupeeValue: data.account.rupeeValue,
          });
        }
      })
      .catch(() => {});

    fetch("/api/coupons/available")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.coupons) {
          setAvailableCoupons(data.coupons);
        }
      })
      .catch(() => {});
  }, []);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const createKey = useRef<{
    quoteId: string;
    address: string;
    method: string;
    id: string;
  } | null>(null);

  const input = {
    outletId: cart.outletId,
    location: cart.location,
    lines: cart.lines,
    couponCode: couponCode.trim() || undefined,
    redeemPoints,
  };
  const inputKey = JSON.stringify(input);
  const quote = quoteResult?.key === inputKey ? quoteResult.quote : null;

  const cartSubtotalPaise = useMemo(() => {
    if (quote?.subtotalPaise) return quote.subtotalPaise;
    if (!menu) return 0;
    const lines = previewCart(cart.lines, menu.items);
    return lines.reduce(
      (sum, line) => sum + line.unitPricePaise * line.quantity,
      0,
    );
  }, [quote?.subtotalPaise, menu, cart.lines]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const validAddress = deliveryAddressSchema.safeParse(address);
    const validInput = quoteInputSchema.safeParse(input);
    if (!validAddress.success || !validInput.success) {
      const msg = !validAddress.success
        ? validAddress.error.issues[0].message
        : "Review your cart and delivery location.";
      setError(msg);
      alert.failure("Checkout Details Required", msg);
      return;
    }
    setPending(true);
    try {
      if (!quote) {
        const response = await requestJson<CheckoutQuote>(
          "/api/checkout/quote",
          { method: "POST", body: JSON.stringify(validInput.data) },
        );
        setQuote({ key: inputKey, quote: response });
        if (response.discountPaise > 0) {
          alert.success(
            "Authoritative Quote & Discount Applied",
            `Your bill total is locked for 5 minutes with discount applied.`,
          );
        } else {
          alert.general(
            "Bill Quote Locked",
            "Authoritative pricing and live kitchen stock verified for 5 minutes.",
          );
        }
        return;
      }
      if (
        !createKey.current ||
        createKey.current.quoteId !== quote.id ||
        createKey.current.address !== validAddress.data ||
        createKey.current.method !== method
      )
        createKey.current = {
          quoteId: quote.id,
          address: validAddress.data,
          method,
          id: crypto.randomUUID(),
        };
      const order = await requestJson<{ id: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          quoteId: quote.id,
          idempotencyKey: createKey.current.id,
          deliveryAddress: validAddress.data,
          paymentMethod: method,
        }),
      });
      router.replace(`/checkout?order=${order.id}`);
      router.refresh();
    } catch (error) {
      const msg = errorMessage(error);
      setError(msg);
      alert.failure("Checkout Error", msg);
      if (error instanceof ClientError && error.status === 409) {
        setQuote(null);
        createKey.current = null;
      }
    } finally {
      setPending(false);
    }
  }

  if (!cart.hydrated) return <p role="status">Loading your basket…</p>;
  if (!cart.lines.length || !cart.outletId)
    return (
      <div className="mx-auto max-w-lg rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-10 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e3d4be] bg-[#fcf6eb] text-[#c99b53]">
          <ShoppingBag className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#0f352d]">
          Your basket is empty
        </h1>
        <p className="my-3 text-sm text-[#5f574c]">
          Choose something delicious before checking out.
        </p>
        <Link
          href="/order"
          className="mt-2 inline-flex min-h-12 items-center rounded-xl bg-[#0f352d] px-6 text-sm font-bold text-white shadow-xs transition hover:bg-[#08231d] active:scale-[0.99]"
        >
          Explore the menu
        </Link>
      </div>
    );
  if (menuError)
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="mb-3 text-sm text-red-800">{menuError}</p>
        <Button onClick={retry}>Reload menu</Button>
      </div>
    );
  if (!menu) return <p role="status">Checking your menu…</p>;

  return (
    <>
      <PageHeader
        eyebrow="Direct from our kitchen"
        title="A few details. Then dinner."
        description={`${menu.outlet.name} · FSSAI ${menu.outlet.fssaiLicense}. Provisional preparation time: ${menu.outlet.minimumPrepMinutes + menu.outlet.packingMinutes} minutes. Delivery is simulated.`}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="space-y-6 rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-[0_12px_36px_rgba(20,18,14,0.05)] sm:p-8"
        >
          {/* Delivery Address */}
          <div>
            <label
              htmlFor="delivery-address"
              className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f352d]"
            >
              <MapPin className="h-4 w-4 text-[#c99b53]" aria-hidden="true" />
              Delivery address
            </label>
            <textarea
              id="delivery-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
              minLength={10}
              maxLength={240}
              disabled={pending}
              placeholder="Building, flat number, street, landmark and area"
              rows={3}
              className="w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] px-4 py-3 text-sm font-medium text-[#1f1c18] outline-none transition placeholder:font-normal placeholder:text-[#9c9283] focus:border-[#0f352d] focus:ring-3 focus:ring-[#0f352d]/12"
            />
            <p className="mt-2 text-xs leading-5 text-[#6b6255]">
              The location pin you selected determines serviceability. This
              address is saved only when you confirm the order.
            </p>
          </div>

          {/* Coupon Code & Available Coupons */}
          <div className="border-t border-[#ece3d5] pt-5">
            <label
              htmlFor="coupon-code"
              className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#0f352d]"
            >
              <span className="flex items-center gap-2">
                <TicketPercent
                  className="h-4 w-4 text-[#4a1d5a]"
                  aria-hidden="true"
                />
                <span>Coupon Code</span>
              </span>
              <span className="font-normal normal-case text-[#6b6255]">
                · optional
              </span>
            </label>
            <div className="flex gap-2">
              <input
                id="coupon-code"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                maxLength={32}
                disabled={pending}
                placeholder="Enter a code (e.g. DIRECT10)"
                className="min-h-12 flex-1 rounded-xl border border-[#dcd2c2] bg-[#fffdfa] px-4 font-mono text-sm font-bold uppercase text-[#1f1c18] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-[#9c9283] focus:border-[#0f352d] focus:ring-3 focus:ring-[#0f352d]/12"
              />
              {couponCode && (
                <button
                  type="button"
                  onClick={() => setCouponCode("")}
                  className="rounded-xl border border-[#dfd4c2] px-3.5 text-xs font-bold text-[#635b50] hover:bg-[#faf7f2]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Customer Coupons Discovery Drawer */}
            {availableCoupons.length > 0 ? (
              <div className="mt-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
                  Available Coupons For This Order
                </p>
                <div className="space-y-2">
                  {availableCoupons.map((coupon) => {
                    const isSelected =
                      couponCode.trim().toUpperCase() === coupon.code.toUpperCase();
                    const isUserLimitReached = coupon.isUserLimitReached;
                    const isUnderMinSpend = cartSubtotalPaise < coupon.minOrderPaise;
                    const deficitRupees = Math.max(
                      0,
                      Math.ceil((coupon.minOrderPaise - cartSubtotalPaise) / 100),
                    );

                    const discountText =
                      coupon.discountType === "PERCENT"
                        ? `${coupon.value}% off${
                            coupon.maxDiscountPaise
                              ? ` (max ₹${Math.round(coupon.maxDiscountPaise / 100)})`
                              : ""
                          }`
                        : `₹${Math.round(coupon.value / 100)} flat off`;

                    // State 1: Reached per-user redemptions -> Faded & shows "Used"
                    if (isUserLimitReached) {
                      return (
                        <div
                          key={coupon.code}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#e3d8c6] bg-[#f5efe4]/60 p-3 opacity-45 cursor-not-allowed select-none"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold line-through text-[#635b50]">
                                {coupon.code}
                              </span>
                              <span className="rounded-full bg-[#dec9ec]/60 px-2 py-0.5 text-[9px] font-bold text-[#4a1d5a]">
                                {discountText}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-[#7a6f60]">
                              You have already redeemed this coupon.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-[#ded5c7] px-2.5 py-1 text-[10px] font-bold text-[#635b50]">
                            Used
                          </span>
                        </div>
                      );
                    }

                    // State 2: Ineligible due to Cart Minimum -> Faded & shows deficit
                    if (isUnderMinSpend) {
                      return (
                        <div
                          key={coupon.code}
                          className="flex flex-col gap-1.5 rounded-xl border border-dashed border-[#dec9ec] bg-[#fcf8ff]/70 p-3 opacity-75 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#4a1d5a]">
                                {coupon.code}
                              </span>
                              <span className="rounded-full bg-[#f4ebfa] border border-[#dec9ec] px-2 py-0.5 text-[9px] font-bold text-[#4a1d5a]">
                                {discountText}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] font-semibold text-amber-900">
                              Add items worth ₹{deficitRupees} more to unlock this coupon
                            </p>
                            <span className="text-[10px] text-[#7a6f60]">
                              Minimum spend required: ₹{Math.round(coupon.minOrderPaise / 100)}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled
                            className="self-start rounded-lg border border-[#e0d6cb] bg-[#f5efe4] px-2.5 py-1 text-[10px] font-bold text-[#8c8273] opacity-60 cursor-not-allowed sm:self-center"
                          >
                            Min spend needed
                          </button>
                        </div>
                      );
                    }

                    // State 3: Eligible & Ready to Apply!
                    return (
                      <div
                        key={coupon.code}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl p-3 transition shadow-2xs",
                          isSelected
                            ? "border-2 border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700/20"
                            : "border border-[#dec9ec] bg-[#fffdfa] hover:border-[#4a1d5a]",
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black tracking-wide text-[#0f352d]">
                              {coupon.code}
                            </span>
                            <span className="rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                              {discountText}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#635b50]">
                            {coupon.minOrderPaise > 0
                              ? `Applicable on orders from ₹${Math.round(coupon.minOrderPaise / 100)}`
                              : "No minimum spend required"}
                          </p>
                        </div>

                        {isSelected ? (
                          <button
                            type="button"
                            onClick={() => setCouponCode("")}
                            className="shrink-0 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-900"
                          >
                            Applied ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCouponCode(coupon.code)}
                            className="shrink-0 rounded-lg bg-[#3b1747] px-3 py-1.5 text-xs font-bold text-[#f4d6a9] shadow-2xs transition hover:bg-[#280d31]"
                          >
                            Apply code
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3.5 py-2 text-xs">
                <span className="font-semibold text-[#4a1d5a]">
                  Try DIRECT10: 10% off orders from ₹300, up to ₹100.
                </span>
                {couponCode.toUpperCase() !== "DIRECT10" && (
                  <button
                    type="button"
                    onClick={() => setCouponCode("DIRECT10")}
                    className="rounded-lg bg-[#3b1747] px-2.5 py-1 text-[11px] font-bold text-[#f4d6a9] transition hover:bg-[#290e32]"
                  >
                    Apply code
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Royal Rewards Loyalty Points */}
          {loyalty && loyalty.pointsBalance > 0 && (
            <div className="border-t border-[#ece3d5] pt-5">
              <div className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-[#fffdfa] to-amber-50/40 p-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-[#b48028]">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#0f352d]">
                      Royal Rewards Points
                    </span>
                    <p className="mt-0.5 text-xs text-[#544d42]">
                      You have{" "}
                      <strong className="font-bold text-[#b48028]">
                        {loyalty.pointsBalance} pts
                      </strong>{" "}
                      available (worth ₹{loyalty.rupeeValue} discount).
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    disabled={pending}
                    className="h-4 w-4 rounded border-amber-300 text-[#0f352d] focus:ring-[#0f352d]"
                  />
                  <span className="text-xs font-bold text-[#0f352d]">
                    {redeemPoints ? "Redeeming" : "Redeem"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="border-t border-[#ece3d5] pt-5">
            <PaymentMethodPicker
              value={method}
              onChange={setMethod}
              disabled={pending}
            />
          </div>

          {/* Authoritative Quote Breakdown */}
          {quote && (
            <div className="rounded-2xl border border-[#d6e8e2] bg-gradient-to-b from-[#eef6f4]/60 to-[#faf7f2] p-5 shadow-2xs">
              <div className="mb-3 flex items-center justify-between border-b border-[#dce7e2] pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0f352d]">
                  Authoritative Bill Summary
                </span>
                <span className="rounded-full bg-[#0f352d] px-2.5 py-0.5 text-[10px] font-bold text-[#f4d6a9]">
                  Price Locked 5m
                </span>
              </div>
              <PriceBreakdown summary={quote} />
              <p className="mt-3 text-xs text-[#6b6255]">
                Quote valid for five minutes. Stock and prices are checked again
                before payment succeeds.
              </p>
            </div>
          )}

          {error && (
            <AlertBanner
              variant="failure"
              title="Checkout Error"
              message={error}
              onDismiss={() => setError("")}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            className="min-h-13 w-full text-base font-bold"
            disabled={pending || !menu.isOpen}
          >
            {pending
              ? "Checking your order…"
              : quote
                ? "Continue to test payment"
                : "Review total"}
            {!pending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece3d5] pt-4 text-xs text-[#655c50]">
            <p className="flex items-center gap-1.5">
              <ShieldCheck
                className="h-4 w-4 text-[#0f352d]"
                aria-hidden="true"
              />
              Test mode only. No money is collected. All prices include 5% GST.
            </p>
            <Link
              href="/order"
              className="inline-flex items-center gap-1 font-bold text-[#0f352d] underline underline-offset-4 hover:text-[#08231d]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to menu
            </Link>
          </div>
        </form>

        <div
          className={pending ? "pointer-events-none opacity-60" : ""}
          inert={pending || undefined}
        >
          <CartPanel menu={menu} checkoutLink={false} />
        </div>
      </div>
    </>
  );
}
