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
      <section className="flex flex-col justify-between bg-[#173e37] px-6 py-9 text-white sm:px-12 lg:p-16">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <UtensilsCrossed
            className="h-5 w-5 text-amber-200"
            aria-hidden="true"
          />
          Restaurant System
        </div>
        <div className="py-12 lg:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Company A · Hyderabad
          </p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
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
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome to the table
          </h2>
          <p className="mb-7 mt-2 text-sm leading-6 text-stone-600">
            Sign in to your account. Your workspace opens automatically.
          </p>
          <AuthForm />
          {process.env.ENABLE_DEMO_DATA === "true" && (
            <details className="mt-8 rounded-xl border border-stone-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Try the local demo accounts
              </summary>
              <p className="mt-3 text-xs leading-6 text-stone-500">
                Synthetic accounts only. Password for all:{" "}
                <code className="font-semibold text-stone-800">
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
