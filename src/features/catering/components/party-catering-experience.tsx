"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Calendar,
  Sparkles,
  Check,
  ArrowRight,
  ShieldCheck,
  Flame,
  UtensilsCrossed,
  Clock,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { SelectMenu } from "@/components/ui/select-menu";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { useAlert } from "@/components/ui/alert-toast";
import { formatMoney } from "@/lib/format";
import { requestJson, errorMessage } from "@/lib/http-client";
import {
  calculateCateringQuote,
  MIN_CATERING_GUESTS,
  MAX_CATERING_GUESTS,
  type CateringRequirements,
} from "../calculator";
import { cn } from "@/lib/classes";

interface OutletOption {
  id: string;
  name: string;
  city: string;
  address: string;
  isCloudKitchen: boolean;
}

interface PartyCateringExperienceProps {
  outlets: OutletOption[];
}

export function PartyCateringExperience({
  outlets,
}: PartyCateringExperienceProps) {
  const router = useRouter();
  const alert = useAlert();

  // Headcount & Menu Preferences
  const [guestCount, setGuestCount] = useState<number>(30);
  const [vegPercentage, setVegPercentage] = useState<number>(30);
  const [biryaniChoice, setBiryaniChoice] = useState<
    "CHICKEN" | "MUTTON" | "MIXED"
  >("CHICKEN");
  const [packageTier, setPackageTier] = useState<
    "ROYAL_DAAWAT" | "NIZAMI_FEAST"
  >("ROYAL_DAAWAT");

  // Scheduling (Default: Tomorrow at 13:00)
  const [defaultDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(13, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [eventDateTime, setEventDateTime] = useState<string>(defaultDateStr);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    outlets[0]?.id || "",
  );
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // Live Calculated Quote
  const quote = useMemo(() => {
    const eventDate = new Date(eventDateTime);
    const validDate = isNaN(eventDate.getTime())
      ? new Date(defaultDateStr)
      : eventDate;

    const req: CateringRequirements = {
      guestCount,
      vegPercentage,
      biryaniChoice,
      packageTier,
      eventDateTime: validDate,
    };
    return calculateCateringQuote(req);
  }, [
    guestCount,
    vegPercentage,
    biryaniChoice,
    packageTier,
    eventDateTime,
    defaultDateStr,
  ]);

  const perGuestPaise = Math.round(
    quote.totalPaise / Math.max(1, quote.guestCount),
  );

  async function handleBookCatering(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 10) {
      const msg =
        "Please provide a detailed delivery address (at least 10 characters).";
      setError(msg);
      alert.failure("Delivery Address Required", msg);
      return;
    }

    if (!quote.isValidLeadTime) {
      const msg = `Catering orders require at least ${quote.minLeadTimeHours} hours advance notice. Selected slot is in ${quote.leadTimeHours} hours.`;
      setError(msg);
      alert.failure("Advance Notice Required", msg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestJson<{
        order: { id: string; orderNumber: string };
      }>("/api/catering/order", {
        method: "POST",
        body: JSON.stringify({
          outletId: selectedOutletId,
          guestCount: quote.guestCount,
          vegPercentage,
          biryaniChoice,
          packageTier,
          eventDateTime: new Date(eventDateTime).toISOString(),
          deliveryAddress: deliveryAddress.trim(),
          specialInstructions: specialInstructions.trim() || undefined,
        }),
      });

      alert.success(
        "Party Catering Request Placed",
        `Order ${res.order.orderNumber} submitted for ${quote.guestCount} guests. Awaiting Catering Manager confirmation.`,
      );
      router.push(`/orders/${res.order.id}`);
      router.refresh();
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      alert.failure("Catering Booking Failed", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-16">
      {/* Unified Luxury Hero Masthead */}
      <header className="mb-9 overflow-hidden rounded-[2.25rem] border border-[#2c1537] bg-gradient-to-br from-[#0b2922] via-[#173a32] to-[#341440] text-white shadow-[0_18px_48px_rgba(25,15,30,0.18)]">
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="flex flex-col justify-between px-6 py-9 sm:px-10 sm:py-11">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f4d6a9]/35 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f4d6a9] backdrop-blur-xs">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                Direct Royal Daawat · Bulk & Party Catering
              </div>
              <h1 className="font-display max-w-xl text-3xl font-bold leading-[1.12] tracking-tight text-[#fffdfa] sm:text-5xl">
                Sealed Clay Dum Handis
                <br />
                <span className="text-[#f4d6a9]">for Your Celebration.</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-stone-200/90 sm:text-base">
                Celebrate weddings, corporate daawats, and family milestones
                with freshly sealed 5kg, 10kg & 20kg earthen handis. Customize
                your guest count and dietary ratio below—dispatched straight
                from our Hyderabad kitchens with zero aggregator commissions.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 border-t border-white/15 pt-5 text-xs font-bold text-[#f4d6a9]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Sealed Clay
                Dum Handis
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> 15 to 500
                Guests
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Up to 12%
                Bulk Celebration Discount
              </span>
            </div>
          </div>

          <div className="relative hidden min-h-72 lg:block">
            <Image
              src="/menu/chicken-biryani.jpg"
              alt="Party dum handi biryani"
              fill
              sizes="(min-width: 1024px) 450px, 40vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1d3336] via-[#1d3336]/35 to-transparent" />
            <div className="absolute right-5 bottom-5 rounded-2xl border border-white/20 bg-black/60 px-4 py-3 text-right backdrop-blur-md">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#f4d6a9]">
                Live Per-Guest Estimate
              </span>
              <span className="font-mono-tabular text-2xl font-black text-white">
                {formatMoney(perGuestPaise)}
              </span>
              <span className="block text-[11px] text-stone-300">
                per guest · 5% GST incl.
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout: Interactive Feast Builder + Live Proposal Sidebar */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.22fr)_420px]">
        {/* Wizard Form */}
        <form onSubmit={handleBookCatering} className="space-y-7">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
            >
              {error}
            </div>
          )}

          {/* Section 1: Headcount & Dietary Split */}
          <section className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#ece3d5] pb-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]"
                >
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
                    Step 1 · Guest Sizing
                  </span>
                  <h2 className="font-display text-xl font-bold text-[#0f352d]">
                    1. Guest Count & Dietary Ratio
                  </h2>
                </div>
              </div>
              <div className="rounded-2xl border border-[#d6e8e2] bg-[#eef6f4] px-3.5 py-1.5 text-right">
                <span className="font-mono-tabular text-lg font-black text-[#0f352d]">
                  {guestCount}
                </span>
                <span className="ml-1 text-xs font-bold text-[#0f352d]">
                  Guests
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <label
                    htmlFor="guest-slider"
                    className="text-sm font-bold text-[#1f1c18]"
                  >
                    Total Number of Guests:{" "}
                    <span className="font-mono-tabular text-base font-black text-[#0f352d]">
                      {guestCount}
                    </span>
                  </label>
                  <span className="text-xs font-medium text-[#655c50]">
                    Min {MIN_CATERING_GUESTS} · Max {MAX_CATERING_GUESTS}
                  </span>
                </div>
                <input
                  id="guest-slider"
                  type="range"
                  min={MIN_CATERING_GUESTS}
                  max={MAX_CATERING_GUESTS}
                  step={5}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="h-2.5 w-full cursor-pointer rounded-lg bg-[#e2d6c3] accent-[#0f352d]"
                />

                {/* Quick Guest Selector Pills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[15, 25, 50, 75, 100, 150, 200].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGuestCount(count)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                        guestCount === count
                          ? "border-[#0f352d] bg-[#0f352d] text-white shadow-2xs"
                          : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:border-[#4a1d5a] hover:bg-white hover:text-[#4a1d5a]",
                      )}
                    >
                      {count} Guests
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Split with Visual Split Bar */}
              <div className="rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-bold text-[#1f1c18]">
                    Dietary Split Ratio
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/25 bg-emerald-50 px-2.5 py-0.5 text-emerald-900">
                      ● {quote.vegCount} Veg ({vegPercentage}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-800/25 bg-red-50 px-2.5 py-0.5 text-red-900">
                      ▲ {quote.nonVegCount} Non-Veg ({100 - vegPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Visual Split Progress Bar */}
                <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-red-200/80 p-0.5">
                  <div
                    className="h-full rounded-l-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${vegPercentage}%` }}
                  />
                </div>

                <input
                  type="range"
                  aria-label="Vegetarian guest percentage"
                  min={0}
                  max={100}
                  step={5}
                  value={vegPercentage}
                  onChange={(e) => setVegPercentage(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-lg bg-[#dfd4c2] accent-[#3b1747]"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Biryani Choices & Package Tier */}
          <section className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-[#ece3d5] pb-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]"
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
                  Step 2 · Culinary Selection
                </span>
                <h2 className="font-display text-xl font-bold text-[#0f352d]">
                  2. Biryani Choice & Feast Package
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[#433d35]">
                  Non-Veg Biryani Handi Recipe
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: "CHICKEN",
                      label: "Chicken Dum Biryani",
                      sub: "Zafrani chicken & aged basmati",
                      badge: "Most Popular",
                    },
                    {
                      id: "MUTTON",
                      label: "Mutton Dum Biryani",
                      sub: "Traditional Kache Gosht ki Dum",
                      badge: "Royal Cut",
                    },
                    {
                      id: "MIXED",
                      label: "Both Chicken & Mutton",
                      sub: "50/50 Dual Handi split",
                      badge: "Best for Crowds",
                    },
                  ].map((b) => {
                    const active = biryaniChoice === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() =>
                          setBiryaniChoice(b.id as typeof biryaniChoice)
                        }
                        className={cn(
                          "flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                          active
                            ? "border-[#0f352d] bg-[#eef6f4] shadow-xs"
                            : "border-[#dfd4c2] bg-[#faf7f2]/70 hover:border-[#4a1d5a]/50 hover:bg-white",
                        )}
                      >
                        <div>
                          <span
                            className={cn(
                              "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              active
                                ? "bg-[#0f352d] text-[#f4d6a9]"
                                : "bg-[#ece3d5] text-[#575046]",
                            )}
                          >
                            {b.badge}
                          </span>
                          <p className="font-display mt-2 text-sm font-bold text-[#0f352d]">
                            {b.label}
                          </p>
                        </div>
                        <p className="mt-1.5 text-xs text-[#635b50]">{b.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Package Tiers */}
              <div className="border-t border-[#ece3d5] pt-5">
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[#433d35]">
                  Select Feast Tier
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPackageTier("ROYAL_DAAWAT")}
                    className={cn(
                      "rounded-2xl border p-5 text-left transition-all",
                      packageTier === "ROYAL_DAAWAT"
                        ? "border-[#0f352d] bg-gradient-to-br from-[#eef6f4] to-[#fffdfa] shadow-sm"
                        : "border-[#dfd4c2] bg-[#faf7f2]/60 hover:border-[#0f352d]/40 hover:bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-[#0f352d]">
                        Royal Daawat
                      </span>
                      <span className="rounded-full border border-[#0f352d]/20 bg-[#0f352d]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0f352d]">
                        Standard Inclusion
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#575046]">
                      Includes Sealed Dum Biryani Handis, Roasted Peanut Mirchi
                      Ka Salan, Burani Raita & Shahi Double Ka Meetha.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPackageTier("NIZAMI_FEAST")}
                    className={cn(
                      "rounded-2xl border p-5 text-left transition-all",
                      packageTier === "NIZAMI_FEAST"
                        ? "border-[#3b1747] bg-gradient-to-br from-[#f8f1fc] to-[#fffdfa] shadow-sm"
                        : "border-[#dfd4c2] bg-[#faf7f2]/60 hover:border-[#3b1747]/40 hover:bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-[#3b1747]">
                        Nizami Feast
                      </span>
                      <span className="rounded-full border border-[#dec9ec] bg-[#3b1747] px-2.5 py-0.5 text-[11px] font-bold text-[#f4d6a9]">
                        +₹80 / guest
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#575046]">
                      Everything in Royal Daawat PLUS Shahi Mutton Haleem &
                      Charcoal Paneer Tikka Starters + Warm Rose Gulab Jamuns.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Event Scheduling & Outlet Assignment */}
          <section className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-[#ece3d5] pb-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]"
              >
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
                  Step 3 · Dispatch & Venue
                </span>
                <h2 className="font-display text-xl font-bold text-[#0f352d]">
                  3. Event Scheduling & Kitchen Outlet
                </h2>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <CustomDateTimePicker
                  label="Event Date & Serving Time"
                  value={eventDateTime}
                  onChange={(val) => setEventDateTime(val)}
                />
                <p
                  className={cn(
                    "mt-1.5 flex items-center gap-1.5 text-xs font-medium",
                    quote.isValidLeadTime
                      ? "text-[#0f352d]"
                      : "font-bold text-amber-800",
                  )}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Requires min 4h preparation window. Lead time:{" "}
                    <strong>{quote.leadTimeHours}h</strong>.
                  </span>
                </p>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#433d35]">
                  Assigned Kitchen Outlet
                </span>
                <SelectMenu
                  ariaLabel="Assigned Kitchen Outlet"
                  size="md"
                  fullWidth
                  searchPlaceholder="Search catering outlet..."
                  value={selectedOutletId}
                  onChange={setSelectedOutletId}
                  options={[
                    ...outlets
                      .filter((o) => !o.isCloudKitchen)
                      .map((o) => ({
                        value: o.id,
                        label: `🍽️ ${o.name} (${o.city})`,
                        badge: "Dine-in",
                        group: "🍽️ Flagship Dine-in Outlets",
                      })),
                    ...outlets
                      .filter((o) => o.isCloudKitchen)
                      .map((o) => ({
                        value: o.id,
                        label: `☁️ ${o.name} (${o.city})`,
                        badge: "Cloud Kitchen",
                        group: "☁️ Cloud Kitchens",
                      })),
                  ]}
                />
                <p className="mt-1.5 text-xs text-[#635b50]">
                  Routes directly to this outlet&apos;s live Kitchen Display
                  System.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4 border-t border-[#ece3d5] pt-5">
              <div>
                <label
                  htmlFor="catering-address"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#433d35]"
                >
                  Venue Delivery Address
                </label>
                <textarea
                  id="catering-address"
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Banquet hall, office floor, apartment community hall, or residence address with landmark"
                  className="w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] p-3.5 text-sm font-medium text-[#1f1c18] outline-none transition placeholder:font-normal placeholder:text-[#9c9283] focus:border-[#0f352d] focus:ring-3 focus:ring-[#0f352d]/12"
                />
              </div>

              <InputField
                label="Special Catering Instructions (Optional)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Deliver by 12:45 PM for 1:00 PM lunch; mild spice on one handi."
              />
            </div>
          </section>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !quote.isValidLeadTime}
            className="min-h-14 w-full text-base font-bold shadow-md"
          >
            {submitting
              ? "Booking catering order…"
              : `Confirm Party Catering · ${formatMoney(quote.totalPaise)}`}
            <ArrowRight className="ml-1 h-5 w-5" aria-hidden="true" />
          </Button>
        </form>

        {/* Live Quote & Handi Allocation Sidebar */}
        <aside className="overflow-hidden rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] shadow-[0_14px_40px_rgba(20,18,14,0.07)] lg:sticky lg:top-24">
          <div className="border-b border-[#ece3d5] bg-gradient-to-r from-[#0f352d] via-[#17483d] to-[#3b1747] px-6 py-5 text-white">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f4d6a9]">
                  Live Handi Manifest
                </span>
                <h3 className="font-display mt-0.5 text-lg font-bold text-white">
                  Party Catering Summary
                </h3>
              </div>
              <span className="rounded-full border border-[#f4d6a9]/35 bg-white/12 px-3 py-1 text-xs font-bold text-[#f4d6a9]">
                {quote.guestCount} Guests
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* Handis Allocation Breakdown */}
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4a1d5a]">
                <Flame className="h-3.5 w-3.5 text-[#c99b53]" aria-hidden="true" />
                Calculated Clay Dum Handis
              </p>
              <ul className="space-y-2.5">
                {quote.handis.map((h, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-3.5 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0f352d] font-mono text-[10px] font-bold text-[#f4d6a9]"
                      >
                        {h.handiSizeKg}kg
                      </span>
                      <div>
                        <span className="block font-bold text-[#1f1c18]">
                          {h.name}
                        </span>
                        <span className="text-[#635b50]">
                          {h.quantity} × {h.handiSizeKg} kg · Serves ~
                          {h.servesGuests} guests
                        </span>
                      </div>
                    </div>
                    <span className="font-mono-tabular shrink-0 font-extrabold text-[#0f352d]">
                      {formatMoney(h.totalPricePaise)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Included Accompaniments */}
            <div className="my-5 border-t border-[#ece3d5] pt-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4a1d5a]">
                <UtensilsCrossed
                  className="h-3.5 w-3.5 text-[#c99b53]"
                  aria-hidden="true"
                />
                Complimentary Accompaniments
              </p>
              <ul className="space-y-2 text-xs text-[#544d42]">
                {quote.accompaniments.map((acc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <span>{acc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-2.5 border-t border-[#ece3d5] pt-4 text-xs">
              <div className="flex justify-between text-[#635b50]">
                <span>Subtotal</span>
                <span className="font-mono-tabular font-semibold">
                  {formatMoney(quote.subtotalPaise)}
                </span>
              </div>
              {quote.bulkDiscountPaise > 0 && (
                <div className="flex justify-between font-bold text-[#4a1d5a]">
                  <span>Bulk Celebration Savings</span>
                  <span className="font-mono-tabular">
                    −{formatMoney(quote.bulkDiscountPaise)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#635b50]">
                <span>Chafing & Clay Pot Packaging</span>
                <span className="font-bold text-emerald-800">
                  Included (Free)
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[#ece3d5] pt-3 text-base font-extrabold text-[#0f352d]">
                <span>Total to Pay</span>
                <span className="font-mono-tabular text-xl">
                  {formatMoney(quote.totalPaise)}
                </span>
              </div>
              <p className="pt-1 text-[11px] leading-5 text-[#635b50]">
                Includes 5% GST: {formatMoney(quote.includedTaxPaise)} (CGST{" "}
                {formatMoney(quote.cgstPaise)} + SGST{" "}
                {formatMoney(quote.sgstPaise)}).
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-[#e3d2b4] bg-[#fcf6eb] p-3.5 text-xs text-[#4e3f28]">
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-[#c99b53]"
                aria-hidden="true"
              />
              <span>
                Guaranteed dough-sealed earthen handis dispatched directly by
                our kitchen team.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
