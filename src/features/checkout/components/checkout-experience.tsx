"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/context";
import { CartPanel } from "@/features/cart/components/cart-panel";
import { useCustomerMenu } from "@/features/menu/use-customer-menu";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ClientError, errorMessage, requestJson } from "@/lib/http-client";
import { quoteInputSchema, deliveryAddressSchema } from "../validation";
import type { CheckoutQuote } from "../types";
import { PriceBreakdown } from "./price-breakdown";
import { PaymentMethodPicker } from "./payment-method";

export function CheckoutExperience() {
  const cart = useCart();
  const router = useRouter();
  const { menu, error: menuError, retry } = useCustomerMenu(cart.outletId);
  const [address, setAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [method, setMethod] = useState<"UPI" | "CARD">("UPI");
  const [quoteResult, setQuote] = useState<{
    key: string;
    quote: CheckoutQuote;
  } | null>(null);
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
  };
  const inputKey = JSON.stringify(input);
  const quote = quoteResult?.key === inputKey ? quoteResult.quote : null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const validAddress = deliveryAddressSchema.safeParse(address);
    const validInput = quoteInputSchema.safeParse(input);
    if (!validAddress.success || !validInput.success) {
      setError(
        !validAddress.success
          ? validAddress.error.issues[0].message
          : "Review your cart and delivery location.",
      );
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
      setError(errorMessage(error));
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
      <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Your basket is empty</h1>
        <p className="my-4 text-sm text-stone-500">
          Choose something delicious before checking out.
        </p>
        <Link
          href="/order"
          className="inline-flex min-h-12 items-center rounded-xl bg-emerald-950 px-6 text-sm font-semibold text-white"
        >
          Explore the menu
        </Link>
      </div>
    );
  if (menuError)
    return (
      <div role="alert">
        <p>{menuError}</p>
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
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"
        >
          <div>
            <label
              htmlFor="delivery-address"
              className="mb-3 block text-sm font-semibold"
            >
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
              placeholder="Building, street, landmark and area"
              rows={3}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-emerald-800"
            />
            <p className="mt-2 text-xs leading-5 text-stone-500">
              The location pin you selected determines serviceability. This
              address is saved only when you confirm the order.
            </p>
          </div>
          <div>
            <label
              htmlFor="coupon-code"
              className="mb-3 block text-sm font-semibold"
            >
              Coupon{" "}
              <span className="font-normal text-stone-500">· optional</span>
            </label>
            <input
              id="coupon-code"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              maxLength={32}
              disabled={pending}
              placeholder="Enter a code"
              className="min-h-12 w-full rounded-xl border border-stone-300 px-4 uppercase outline-none focus:border-emerald-800"
            />
            <p className="mt-2 text-xs text-emerald-800">
              Try DIRECT10: 10% off orders from ₹300, up to ₹100.
            </p>
          </div>
          <PaymentMethodPicker
            value={method}
            onChange={setMethod}
            disabled={pending}
          />
          {quote && (
            <div className="rounded-2xl bg-stone-50 p-5">
              <PriceBreakdown summary={quote} />
              <p className="mt-3 text-xs text-stone-500">
                Quote valid for five minutes. Stock and prices are checked again
                before payment succeeds.
              </p>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full bg-emerald-950 hover:bg-emerald-900"
            disabled={pending || !menu.isOpen}
          >
            {pending
              ? "Checking your order…"
              : quote
                ? "Continue to test payment"
                : "Review total"}
          </Button>
          <p className="text-xs leading-6 text-stone-500">
            Test mode only. No money is collected. All prices include 5% GST.
          </p>
          <Link
            href="/order"
            className="inline-block text-sm text-stone-500 underline underline-offset-4"
          >
            Back to menu
          </Link>
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
