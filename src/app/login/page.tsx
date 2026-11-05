import { redirect } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { getViewer } from "@/features/auth/session";
import { homeForRole } from "@/features/auth/roles";
import { AuthForm } from "@/features/auth/components/auth-form";
import { demoAccounts, DEMO_PASSWORD } from "@/features/auth/demo-accounts";

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(homeForRole(viewer.role));
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#133d34] px-6 py-9 text-white sm:px-12 lg:p-16">
        <div className="flex items-center gap-3 text-sm font-bold">
          <UtensilsCrossed
            className="h-5 w-5 text-[#f4d6a9]"
            aria-hidden="true"
          />
          Restaurant System
        </div>
        <div className="py-12 lg:py-20">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#f4d6a9]">
            Company A · Hyderabad
          </p>
          <h1 className="max-w-lg text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Good food.
            <br />
            Closer to you.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-stone-200">
            One home for direct orders, thoughtful menus and kitchens that keep
            moving.
          </p>
        </div>
        <p className="text-xs text-stone-300">
          Customer and staff access · Foundation preview
        </p>
      </section>
      <section className="flex items-center justify-center bg-[#faf8f5] px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight text-[#133d34]">
            Welcome to the table
          </h2>
          <p className="mb-7 mt-2 text-sm leading-6 text-[#635b50]">
            Sign in to your account. Your workspace opens automatically.
          </p>
          <AuthForm />
          {process.env.ENABLE_DEMO_DATA === "true" && (
            <details className="mt-8 rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs">
              <summary className="cursor-pointer text-sm font-bold text-[#133d34]">
                Try the local demo accounts
              </summary>
              <p className="mt-3 text-xs leading-6 text-[#635b50]">
                Synthetic accounts only. Password for all:{" "}
                <code className="rounded-md border border-[#e4d3f1] bg-[#f5effa] px-2 py-0.5 font-bold text-[#4a1d5a]">
                  {DEMO_PASSWORD}
                </code>
              </p>
              <ul className="mt-3 space-y-3">
                {demoAccounts
                  .filter((account) => account.id !== "demo-customer-two")
                  .map((account) => (
                    <li key={account.id} className="text-xs">
                      <span className="block font-medium">{account.name}</span>
                      <code className="break-all text-stone-600">
                        {account.email}
                      </code>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
