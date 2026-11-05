import { useId, type InputHTMLAttributes } from "react";

export function InputField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-12 w-full rounded-xl border border-[#ded5c6] bg-[#fffdfa] px-4 text-base text-[#25221e] outline-none transition placeholder:text-stone-400 focus:border-[#133d34] focus:ring-3 focus:ring-[#f5effa] disabled:bg-[#f3ede3]"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
