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
      <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#433d35]">
        Payment method
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {(["UPI", "CARD"] as const).map((method) => {
          const selected = value === method;
          return (
            <label
              key={method}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all",
                selected
                  ? "border-[#0f352d] bg-[#eef6f4] text-[#0f352d] font-bold shadow-xs"
                  : "border-[#dfd4c2] bg-[#fffdfa] text-[#544d42] hover:border-[#4a1d5a]/50 hover:bg-[#faf7f2]",
              )}
            >
              <input
                type="radio"
                name="payment-method"
                checked={selected}
                onChange={() => onChange(method)}
                disabled={disabled}
                className="h-4 w-4 accent-[#0f352d]"
              />
              {method === "UPI" ? (
                <Smartphone className="h-4 w-4 text-[#0f352d]" aria-hidden="true" />
              ) : (
                <CreditCard className="h-4 w-4 text-[#4a1d5a]" aria-hidden="true" />
              )}
              <span>{method === "UPI" ? "UPI" : "Card"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
