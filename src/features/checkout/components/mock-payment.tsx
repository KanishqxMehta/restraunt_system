"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, CheckCircle2, XCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner, useAlert } from "@/components/ui/alert-toast";
import { useCart } from "@/features/cart/context";
import { ClientError, errorMessage, requestJson } from "@/lib/http-client";
import { formatMoney } from "@/lib/format";
import { PaymentMethodPicker } from "./payment-method";
import type { findOrder } from "@/features/orders/repository";
import { cn } from "@/lib/classes";

type Outcome = "SUCCESS" | "FAILED" | "CANCELLED";

export function MockPayment({
  order,
}: {
  order: Awaited<ReturnType<typeof findOrder>>;
}) {
  const router = useRouter();
  const cart = useCart();
  const alert = useAlert();
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
        alert.success(
          "Payment Successful · Order Dispatched",
          `Order ${order.orderNumber} has been sent directly to ${order.outlet.name}.`,
        );
        router.replace(`/orders/${response.id}`);
        router.refresh();
        return;
      }
      const nextMsg =
        response.outcome === "FAILED"
          ? "Test payment was declined. Nothing was charged. Choose success and try again when ready."
          : "Test payment was cancelled. Your unpaid order has not been sent to the kitchen. You can retry.";
      setMessage(nextMsg);
      if (response.outcome === "FAILED") {
        alert.failure("Payment Declined", nextMsg);
      } else {
        alert.general("Payment Cancelled", nextMsg);
      }
    } catch (error) {
      const msg = errorMessage(error);
      setMessage(msg);
      alert.failure("Payment Gateway Error", msg);
      if (error instanceof ClientError) {
        attempt.current = null;
        if ([400, 404, 409, 410].includes(error.status)) setRestart(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl overflow-hidden rounded-[2.25rem] border border-[#dfd4c2] bg-[#fffdfa] shadow-[0_18px_48px_rgba(20,18,14,0.08)]">
      {/* Top Gateway Header */}
      <div className="border-b border-[#ece3d5] bg-gradient-to-r from-[#0f352d] via-[#17483d] to-[#3b1747] px-6 py-6 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f4d6a9]/35 bg-white/10 px-3 py-1 text-xs font-bold text-[#f4d6a9]">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Test payment · No money moves
          </span>
          <span className="font-mono text-xs font-bold text-stone-200">
            {order.orderNumber}
          </span>
        </div>

        <h1 className="font-display mt-4 text-2xl font-bold text-white sm:text-3xl">
          Finish your order
        </h1>
        <p className="mt-1 text-xs text-stone-200">{order.outlet.name}</p>

        <div className="mt-5 flex items-baseline justify-between rounded-2xl border border-white/15 bg-black/25 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">
            Amount Payable
          </span>
          <span className="font-mono-tabular text-3xl font-extrabold text-[#f4d6a9]">
            {formatMoney(order.totalPaise)}
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <p className="mb-6 text-sm leading-6 text-[#5f574c]">
          This payment screen simulates UPI and card outcomes. No card details,
          UPI PIN or bank account information are needed.
        </p>

        <PaymentMethodPicker
          value={method}
          onChange={setMethod}
          disabled={pending || restart}
        />

        <fieldset className="my-6">
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-[#433d35]">
            Choose a test outcome
          </legend>
          <div className="space-y-2.5">
            {(
              [
                [
                  "SUCCESS",
                  "Successful payment",
                  "Confirms order & dispatches to kitchen KDS",
                  CheckCircle2,
                ],
                [
                  "FAILED",
                  "Declined payment",
                  "Simulates bank timeout or declined transaction",
                  XCircle,
                ],
                [
                  "CANCELLED",
                  "Cancelled payment",
                  "Simulates customer closing the payment prompt",
                  Ban,
                ],
              ] as const
            ).map(([value, label, sub, Icon]) => {
              const selected = outcome === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-13 cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3 text-sm transition-all",
                    selected
                      ? "border-[#0f352d] bg-[#eef6f4] text-[#0f352d] font-bold shadow-2xs"
                      : "border-[#dfd4c2] bg-[#fffdfa] text-[#25221e] hover:border-[#4a1d5a]/40 hover:bg-[#faf7f2]",
                  )}
                >
                  <input
                    type="radio"
                    name="outcome"
                    value={value}
                    checked={selected}
                    onChange={() => setOutcome(value)}
                    disabled={pending || restart}
                    className="h-4 w-4 accent-[#0f352d]"
                  />
                  <span className="flex-1">
                    <span className="block font-bold">{label}</span>
                    <span
                      aria-hidden="true"
                      className="block text-xs font-normal text-[#655c50]"
                    >
                      {sub}
                    </span>
                  </span>
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === "SUCCESS"
                        ? "text-emerald-700"
                        : value === "FAILED"
                          ? "text-red-700"
                          : "text-amber-700",
                    )}
                  />
                </label>
              );
            })}
          </div>
        </fieldset>

        {message && (
          <div className="mb-5">
            <AlertBanner
              variant={outcome === "FAILED" ? "failure" : "general"}
              title={
                outcome === "FAILED"
                  ? "Test Payment Declined"
                  : "Test Payment Notice"
              }
              message={message}
              onDismiss={() => setMessage("")}
            />
          </div>
        )}

        {restart ? (
          <Link
            href="/checkout"
            className="flex min-h-12 items-center justify-center rounded-xl bg-[#0f352d] text-sm font-bold text-white shadow-xs transition hover:bg-[#08231d]"
          >
            Review a fresh checkout
          </Link>
        ) : (
          <Button
            type="button"
            onClick={pay}
            disabled={pending}
            variant="primary"
            className="min-h-13 w-full text-base font-bold"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {pending ? "Processing test payment…" : "Run test payment"}
          </Button>
        )}

        <Link
          href="/order"
          className="mt-5 block text-center text-sm font-bold text-[#4a1d5a] underline underline-offset-4 hover:text-[#290e32]"
        >
          Return to menu
        </Link>
      </div>
    </section>
  );
}
