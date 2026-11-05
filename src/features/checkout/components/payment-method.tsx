"use client";
import { CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/classes";
export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: "UPI" | "CARD";
  onChange: (value: "UPI" | "CARD") => void;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">Payment method</legend>
      <div className="grid grid-cols-2 gap-3">
        {(["UPI", "CARD"] as const).map((method) => (
          <label
            key={method}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border px-4 text-sm",
              value === method
                ? "border-emerald-800 bg-emerald-50"
                : "border-stone-200",
            )}
          >
            <input
              type="radio"
              name="payment-method"
              checked={value === method}
              onChange={() => onChange(method)}
              disabled={disabled}
              className="accent-emerald-900"
            />
            {method === "UPI" ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {method === "UPI" ? "UPI" : "Card"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
