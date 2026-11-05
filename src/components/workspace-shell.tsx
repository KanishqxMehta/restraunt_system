import Link from "next/link";
import type { ReactNode } from "react";
import type { Viewer } from "@/features/auth/policy";
import { roleLabels } from "@/features/auth/roles";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export function WorkspaceShell({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:block focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="font-semibold tracking-tight">
            Restaurant System
            <span className="mt-1 block text-xs font-normal tracking-wide text-stone-500">
              Company A · Hyderabad
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {viewer.role === "CUSTOMER" && (
              <nav
                aria-label="Customer navigation"
                className="flex gap-4 text-sm"
              >
                <Link
                  href="/order"
                  className="text-emerald-900 hover:underline"
                >
                  Order food
                </Link>
                <Link
                  href="/account"
                  className="text-stone-500 hover:underline"
                >
                  My orders
                </Link>
              </nav>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{viewer.name}</p>
              <p className="text-xs text-stone-500">
                {roleLabels[viewer.role]}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        {process.env.ENABLE_DEMO_DATA === "true" && (
          <p className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
            Demo environment · All accounts, licence numbers and business data
            are synthetic.
          </p>
        )}
        {children}
      </main>
    </>
  );
}
