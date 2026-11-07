"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "../client";
import { demoAccounts, DEMO_PASSWORD } from "../demo-accounts";
import { roleLabels } from "../roles";
import { cn } from "@/lib/classes";

export function DemoAccountPicker() {
  const router = useRouter();
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFastSignIn(email: string, id: string) {
    if (signingInId) return;
    setSigningInId(id);
    setError(null);
    try {
      const response = await authClient.signIn.email({
        email,
        password: DEMO_PASSWORD,
      });

      if (response.error) {
        setError(
          response.error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : "Could not sign in with demo credentials. Please try again.",
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Failed to connect to authentication service. Please try again.");
    } finally {
      setSigningInId(null);
    }
  }

  const visibleAccounts = demoAccounts.filter(
    (a) => a.id !== "demo-customer-two",
  );

  return (
    <details
      className="group mt-6 overflow-hidden rounded-2xl border border-[#ded2bf] bg-[#fffdfa] shadow-xs transition"
      open
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-[#0f352d] select-none hover:bg-[#faf5ec]">
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#c99b53]" aria-hidden="true" />
          1-Click Reviewer Demo Logins
        </span>
        <span className="rounded-full border border-[#e4d3f1] bg-[#f7f2fa] px-2.5 py-0.5 text-[11px] font-bold text-[#4a1d5a]">
          {visibleAccounts.length} roles · 1 tap
        </span>
      </summary>

      <div className="border-t border-[#ece3d5] bg-[#faf7f2]/60 px-5 py-4">
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}
        <p className="text-xs leading-5 text-[#5f574c]">
          Click any role below to sign in instantly with synthetic demo
          credentials (or use password:{" "}
          <code className="rounded-md border border-[#dec9ec] bg-[#f7f2fa] px-1.5 py-0.5 font-mono font-bold text-[#3b1747]">
            {DEMO_PASSWORD}
          </code>
          ):
        </p>

        <ul className="mt-3 grid gap-2.5">
          {visibleAccounts.map((account) => {
            const isLoggingIn = signingInId === account.id;
            return (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5dbc9] bg-[#fffdfa] p-3 text-xs shadow-2xs hover:border-[#0f352d]/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <span className="block font-bold text-[#1f1c18]">
                    {account.name}
                  </span>
                  <code className="font-mono text-[11px] break-all text-[#4a1d5a]">
                    {account.email}
                  </code>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#635b50]">
                    {account.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f352d]">
                    {roleLabels[account.role]}
                  </span>

                  <button
                    type="button"
                    disabled={Boolean(signingInId)}
                    onClick={() => handleFastSignIn(account.email, account.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition shadow-2xs cursor-pointer disabled:opacity-50",
                      account.role === "KITCHEN_STAFF"
                        ? "bg-[#3b1747] hover:bg-[#250e2d]"
                        : account.role === "CENTRAL_ADMIN"
                          ? "bg-[#0f352d] hover:bg-[#071d18]"
                          : "bg-[#c99b53] hover:bg-[#a67c38]",
                    )}
                  >
                    {isLoggingIn ? (
                      <>
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        <span>Opening…</span>
                      </>
                    ) : (
                      <>
                        <span>Open</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
