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
      <header className="border-b border-[#e8ded0] bg-[#fffdfa] shadow-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="group font-bold tracking-tight text-[#133d34]">
            <span className="text-lg">Restaurant System</span>
            <span className="mt-0.5 block text-xs font-semibold tracking-wider uppercase text-[#4a1d5a]">
              Company A · Hyderabad
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {viewer.role === "CUSTOMER" && (
              <nav
                aria-label="Customer navigation"
                className="flex items-center gap-4 text-sm"
              >
                <Link
                  href="/order"
                  className="font-semibold text-[#133d34] transition hover:text-[#0c2a23] hover:underline"
                >
                  Order food
                </Link>
                <Link
                  href="/party-orders"
                  className="font-semibold text-[#4a1d5a] transition hover:text-[#2d1136] hover:underline"
                >
                  Party catering
                </Link>
                <Link
                  href="/account"
                  className="text-[#635b50] transition hover:text-[#4a1d5a] hover:underline"
                >
                  My orders
                </Link>
              </nav>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#25221e]">{viewer.name}</p>
              <span className="inline-block mt-0.5 rounded-full border border-[#e2d0ee] bg-[#f5effa] px-2.5 py-0.5 text-[11px] font-bold text-[#4a1d5a]">
                {roleLabels[viewer.role]}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        {process.env.ENABLE_DEMO_DATA === "true" && (
          <p className="mb-8 rounded-xl border border-[#ded5c6] bg-[#fbf9f4] px-4 py-3 text-xs leading-5 text-[#544d42]">
            <strong className="text-[#133d34]">Demo environment</strong> · All accounts, licence numbers and business data
            are synthetic.
          </p>
        )}
        {children}
      </main>
    </>
  );
}
