import Link from "next/link";
import type { ReactNode } from "react";
import { UtensilsCrossed, ShieldCheck, Sparkles } from "lucide-react";
import type { Viewer } from "@/features/auth/policy";
import { roleLabels } from "@/features/auth/roles";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { DemoRoleSwitcher } from "@/features/auth/components/demo-role-switcher";
import { WorkspaceNav } from "./workspace-nav";

export function WorkspaceShell({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: ReactNode;
}) {
  const initials = viewer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-[#0f352d] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Top Royal Accent Ribbon */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0f352d] via-[#c99b53] to-[#3b1747]" />

      <header className="sticky top-0 z-30 border-b border-[#e3d8c6]/90 bg-[#fffdfa]/92 backdrop-blur-md shadow-[0_2px_16px_rgba(20,18,14,0.04)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 tracking-tight text-[#0f352d]"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#14453a] to-[#0a241e] text-[#f4d6a9] shadow-[0_2px_8px_rgba(15,53,45,0.2)] transition-transform duration-200 group-hover:scale-105"
            >
              <UtensilsCrossed className="h-4.5 w-4.5" />
            </span>
            <div className="leading-tight">
              <span className="font-display block text-base font-bold text-[#0f352d] sm:text-lg">
                Restaurant System
              </span>
              <span className="block text-[10px] font-bold tracking-[0.16em] uppercase text-[#4a1d5a]">
                Company A · Hyderabad
              </span>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="overflow-x-auto py-0.5">
              <WorkspaceNav role={viewer.role} />
            </div>

            <div className="hidden items-center gap-2 rounded-2xl border border-[#e7ddd0] bg-[#faf7f2] py-1 pr-2.5 pl-1.5 xl:flex">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#3b1747] text-[11px] font-extrabold text-[#f4d6a9]"
              >
                {initials || "CA"}
              </span>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-[#1f1c18]">{viewer.name}</p>
                <span className="inline-block text-[9px] font-bold tracking-wide uppercase text-[#4a1d5a]">
                  {roleLabels[viewer.role]}
                </span>
              </div>
            </div>

            <SignOutButton />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-8 sm:py-10"
      >
        {process.env.ENABLE_DEMO_DATA === "true" && (
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2d4be] bg-gradient-to-r from-[#fcf8f0] via-[#fffdfa] to-[#f7f2fa] px-4 py-2.5 text-xs text-[#544d42] shadow-2xs">
            <p className="flex items-center gap-2 leading-5">
              <Sparkles
                className="h-3.5 w-3.5 shrink-0 text-[#c99b53]"
                aria-hidden="true"
              />
              <span>
                <strong className="font-bold text-[#0f352d]">
                  Demo environment
                </strong>{" "}
                · All accounts, FSSAI licence numbers and business metrics are
                synthetic.
              </span>
            </p>
            <DemoRoleSwitcher currentEmail={viewer.email} />
          </div>
        )}
        {children}
      </main>

      <footer className="mt-16 border-t border-[#e5dbc9] bg-[#f6f1e7]/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-[#655c50] sm:px-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck
              className="h-4 w-4 text-[#0f352d]"
              aria-hidden="true"
            />
            <span>
              <strong className="font-bold text-[#0f352d]">
                Company A · Royal Kitchens of Hyderabad
              </strong>{" "}
              · Direct Ordering & Live Kitchen Dispatch
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-semibold">
            <span>All prices inclusive of 5% GST</span>
            <span aria-hidden="true">·</span>
            <Link
              href="/photo-credits"
              className="text-[#4a1d5a] underline decoration-[#d8bfe8] underline-offset-4 transition hover:text-[#290e32]"
            >
              Photography credits
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
