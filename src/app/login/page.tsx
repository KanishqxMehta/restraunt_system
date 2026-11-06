import { redirect } from "next/navigation";
import Image from "next/image";
import {
  UtensilsCrossed,
  ShieldCheck,
  Flame,
  Clock,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { getViewer } from "@/features/auth/session";
import { homeForRole, roleLabels } from "@/features/auth/roles";
import { AuthForm } from "@/features/auth/components/auth-form";
import { demoAccounts, DEMO_PASSWORD } from "@/features/auth/demo-accounts";

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(homeForRole(viewer.role));

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left Culinary Heritage Showcase */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b2922] via-[#123d33] to-[#2d1238] px-6 py-10 text-white sm:px-12 lg:p-16">
        {/* Ambient Decorative Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#c99b53]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#7e3aa3]/15 blur-3xl"
        />

        {/* Brand Crest */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f4d6a9]/30 bg-white/10 text-[#f4d6a9] shadow-inner backdrop-blur-xs">
              <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="font-display block text-lg font-bold tracking-tight text-white">
                Restaurant System
              </span>
              <span className="block text-[10px] font-bold tracking-[0.22em] uppercase text-[#f4d6a9]">
                Company A · Royal Kitchens
              </span>
            </div>
          </div>
          <span className="hidden rounded-full border border-[#f4d6a9]/25 bg-white/10 px-3.5 py-1 text-xs font-semibold text-[#f4d6a9] backdrop-blur-xs sm:inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Est. Hyderabad
          </span>
        </div>

        {/* Hero Copy & Bento Card */}
        <div className="relative z-10 my-10 lg:my-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f4d6a9]/30 bg-[#f4d6a9]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#f4d6a9]">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Direct from Our Dum Kitchens
          </div>
          <h1 className="font-display max-w-xl text-4xl font-bold leading-[1.12] tracking-tight text-[#fffdfa] sm:text-5xl lg:text-[3.35rem]">
            Slow-cooked heritage.
            <br />
            <span className="text-[#f4d6a9]">Closer to your table.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-200/90">
            Authentic Hyderabadi Kache Gosht & Chicken Dum Biryani sealed in
            earthen handis, bespoke party catering, and live kitchen telemetry—all
            with zero aggregator commissions.
          </p>

          {/* Featured Dish & Telemetry Preview Bento */}
          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-[1.2fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/25 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3.5">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20">
                  <Image
                    src="/menu/chicken-biryani.jpg"
                    alt="Signature Hyderabadi Dum Biryani"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <span className="inline-block rounded-md bg-[#f4d6a9]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f4d6a9]">
                    House Signature
                  </span>
                  <p className="font-display mt-1 text-sm font-bold text-white">
                    Zafrani Dum Biryani Handi
                  </p>
                  <p className="text-xs text-stone-300">
                    Aged basmati · Saffron · 5% GST incl.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-[#f4d6a9]">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Live Kitchen SLA</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-stone-200">
                Real-time station tracking from Kondapur, Gachibowli &
                Kukatpally kitchens.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Trust Pillars */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-xs text-stone-300">
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck
                className="h-4 w-4 text-[#f4d6a9]"
                aria-hidden="true"
              />
              FSSAI Certified Kitchens
            </span>
            <span>·</span>
            <span>DPDP 2023 Privacy First</span>
          </div>
          <span className="text-stone-400">
            Customer, Kitchen & Executive Portal
          </span>
        </div>
      </section>

      {/* Right Authentication Workspace */}
      <section className="flex items-center justify-center bg-[#faf7f2] px-5 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="rounded-[2rem] border border-[#e3d8c6] bg-[#fffdfa] p-6 shadow-[0_16px_48px_rgba(25,20,15,0.06)] sm:p-9">
            <div className="mb-6">
              <span className="inline-block rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
                Direct Hospitality Portal
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-[#0f352d]">
                Welcome to the table
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[#5f574c]">
                Sign in to your account or create a customer profile. Your
                assigned workspace opens automatically.
              </p>
            </div>

            <AuthForm />
          </div>

          {process.env.ENABLE_DEMO_DATA === "true" && (
            <details className="group mt-6 overflow-hidden rounded-2xl border border-[#ded2bf] bg-[#fffdfa] shadow-xs transition">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-[#0f352d] select-none hover:bg-[#faf5ec]">
                <span className="flex items-center gap-2">
                  <KeyRound
                    className="h-4 w-4 text-[#c99b53]"
                    aria-hidden="true"
                  />
                  Try the local demo accounts
                </span>
                <span className="rounded-full border border-[#e4d3f1] bg-[#f7f2fa] px-2.5 py-0.5 text-[11px] font-bold text-[#4a1d5a]">
                  {demoAccounts.filter((a) => a.id !== "demo-customer-two").length} roles
                </span>
              </summary>
              <div className="border-t border-[#ece3d5] bg-[#faf7f2]/60 px-5 py-4">
                <p className="text-xs leading-6 text-[#5f574c]">
                  Synthetic accounts only. Password for all:{" "}
                  <code className="rounded-md border border-[#dec9ec] bg-[#f7f2fa] px-2 py-0.5 font-mono text-xs font-bold text-[#3b1747]">
                    {DEMO_PASSWORD}
                  </code>
                </p>
                <ul className="mt-3 grid gap-2.5">
                  {demoAccounts
                    .filter((account) => account.id !== "demo-customer-two")
                    .map((account) => (
                      <li
                        key={account.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e5dbc9] bg-[#fffdfa] px-3.5 py-2.5 text-xs shadow-2xs"
                      >
                        <div>
                          <span className="block font-bold text-[#1f1c18]">
                            {account.name}
                          </span>
                          <code className="font-mono text-[11px] break-all text-[#4a1d5a]">
                            {account.email}
                          </code>
                        </div>
                        <span className="rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f352d]">
                          {roleLabels[account.role]}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
