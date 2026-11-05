"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/context";
import { ClientError, errorMessage, requestJson } from "@/lib/http-client";
import { formatMoney } from "@/lib/format";
import { PaymentMethodPicker } from "./payment-method";
import type { findOrder } from "@/features/orders/repository";

type Outcome = "SUCCESS" | "FAILED" | "CANCELLED";
export function MockPayment({
  order,
}: {
  order: Awaited<ReturnType<typeof findOrder>>;
}) {
  const router = useRouter();
  const cart = useCart();
  const [method, setMethod] = useState(order.paymentMethod);
  const [outcome, setOutcome] = useState<Outcome>("SUCCESS");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [restart, setRestart] = useState(false);
  const attempt = useRef<{
    idempotencyKey: string;
    method: "UPI" | "CARD";
    outcome: Outcome;
  } | null>(null);
  async function pay() {
    if (pending) return;
    setPending(true);
    setMessage("");
    if (
      !attempt.current ||
      attempt.current.method !== method ||
      attempt.current.outcome !== outcome
    )
      attempt.current = {
        idempotencyKey: crypto.randomUUID(),
        method,
        outcome,
      };
    try {
      const response = await requestJson<{
        id: string;
        paid: boolean;
        outcome: Outcome;
      }>(`/api/orders/${order.id}/mock-payment`, {
        method: "POST",
        body: JSON.stringify(attempt.current),
      });
      attempt.current = null;
      if (response.paid) {
        cart.clear();
        router.replace(`/orders/${response.id}`);
        router.refresh();
        return;
      }
      setMessage(
        response.outcome === "FAILED"
          ? "Test payment was declined. Nothing was charged. Choose success and try again when ready."
          : "Test payment was cancelled. Your unpaid order has not been sent to the kitchen. You can retry.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
      if (error instanceof ClientError) {
        attempt.current = null;
        if ([400, 404, 409, 410].includes(error.status)) setRestart(true);
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 sm:p-8 shadow-xs">
      <p className="mb-4 inline-flex rounded-full border border-[#e4d3f1] bg-[#f5effa] px-3 py-1.5 text-xs font-bold text-[#4a1d5a]">
        Test payment · No money moves
      </p>
      <h1 className="text-2xl font-bold text-[#133d34]">Finish your order</h1>
      <p className="mt-2 text-sm text-[#635b50]">
        {order.orderNumber} · {order.outlet.name}
      </p>
      <p className="my-6 text-4xl font-extrabold text-[#133d34]">
        {formatMoney(order.totalPaise)}
      </p>
      <p className="mb-6 text-sm leading-6 text-[#635b50]">
        This payment screen simulates UPI and card outcomes. No card details,
        UPI PIN or bank account information are needed.
      </p>
      <PaymentMethodPicker
        value={method}
        onChange={setMethod}
        disabled={pending || restart}
      />
      <fieldset className="my-6">
        <legend className="mb-3 text-sm font-bold text-[#133d34]">
          Choose a test outcome
        </legend>
        <div className="space-y-2">
          {(
            [
              ["SUCCESS", "Successful payment"],
              ["FAILED", "Declined payment"],
              ["CANCELLED", "Cancelled payment"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#25221e] cursor-pointer"
            >
              <input
                type="radio"
                name="outcome"
                value={value}
                checked={outcome === value}
                onChange={() => setOutcome(value)}
                disabled={pending || restart}
                className="accent-[#133d34]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {message && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          {message}
        </p>
      )}
      {restart ? (
        <Link
          href="/checkout"
          className="flex min-h-12 items-center justify-center rounded-xl bg-[#133d34] text-sm font-bold text-white transition hover:bg-[#0c2a23] shadow-xs"
        >
          Review a fresh checkout
        </Link>
      ) : (
        <Button
          type="button"
          onClick={pay}
          disabled={pending}
          variant="primary"
          className="w-full"
        >
          {pending ? "Processing test payment…" : "Run test payment"}
        </Button>
      )}
      <Link
        href="/order"
        className="mt-5 block text-center text-sm font-semibold text-[#4a1d5a] underline underline-offset-4 hover:text-[#2b1035]"
      >
        Return to menu
      </Link>
    </section>
  );
}
