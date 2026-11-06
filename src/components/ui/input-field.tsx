import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/classes";

export function InputField({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-bold tracking-wide uppercase text-[#433d35]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "min-h-12 w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] px-4 text-sm font-medium text-[#1f1c18] shadow-[inset_0_1px_2px_rgba(37,34,30,0.04)] outline-none transition placeholder:font-normal placeholder:text-[#9c9283] focus:border-[#0f352d] focus:bg-white focus:ring-3 focus:ring-[#0f352d]/12 disabled:bg-[#f3ede3] disabled:text-[#78716c]",
          error && "border-red-400 focus:border-red-600 focus:ring-red-500/15",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
