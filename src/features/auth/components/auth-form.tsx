"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "../client";
import { signInSchema, signUpSchema } from "../validation";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { cn } from "@/lib/classes";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const data = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      marketingOptIn: form.get("marketingOptIn") === "on",
    };
    const result =
      mode === "login"
        ? signInSchema.safeParse(data)
        : signUpSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setPending(true);
    try {
      const response =
        mode === "login"
          ? await authClient.signIn.email(signInSchema.parse(data))
          : await authClient.signUp.email(signUpSchema.parse(data));
      if (response.error) {
        setError(
          response.error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : mode === "login"
              ? "We couldn't sign you in. Check your email and password."
              : "We couldn't create your account. Check your details or try signing in.",
        );
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div
        className="mb-7 grid grid-cols-2 rounded-xl border border-[#ded5c6] bg-[#f4efe5] p-1 shadow-xs"
        aria-label="Account action"
      >
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            disabled={pending}
            onClick={() => {
              setMode(value);
              setError("");
            }}
            className={cn(
              "min-h-11 rounded-lg text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-[#3b1747]",
              mode === value
                ? "bg-[#fffdfa] text-[#133d34] shadow-xs"
                : "text-[#635b50] hover:text-[#4a1d5a]",
            )}
          >
            {value === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
        {mode === "register" && (
          <InputField
            label="Your name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            disabled={pending}
          />
        )}
        <InputField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 12 : undefined}
          maxLength={128}
          required
          disabled={pending}
        />
        {mode === "register" && (
          <>
            <p className="text-xs leading-5 text-stone-500">
              Use at least 12 characters. New accounts are customer accounts.
            </p>
            <label className="flex items-start gap-3 text-sm leading-6 text-stone-600">
              <input
                name="marketingOptIn"
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-orange-800"
                disabled={pending}
              />
              <span>
                I would like offers and updates. Optional; you can order without
                opting in.
              </span>
            </label>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"
          >
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Please wait…
            </>
          ) : (
            <>
              {mode === "login" ? "Sign in" : "Create customer account"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
