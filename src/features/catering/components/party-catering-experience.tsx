"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Users, Calendar, Sparkles, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { formatMoney } from "@/lib/format";
import { requestJson, errorMessage } from "@/lib/http-client";
import {
  calculateCateringQuote,
  MIN_CATERING_GUESTS,
  MAX_CATERING_GUESTS,
  type CateringRequirements,
} from "../calculator";

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

export function PartyCateringExperience({ outlets }: PartyCateringExperienceProps) {
  const router = useRouter();

  // Headcount & Menu Preferences
  const [guestCount, setGuestCount] = useState<number>(30);
  const [vegPercentage, setVegPercentage] = useState<number>(30);
  const [biryaniChoice, setBiryaniChoice] = useState<"CHICKEN" | "MUTTON" | "MIXED">("CHICKEN");
  const [packageTier, setPackageTier] = useState<"ROYAL_DAAWAT" | "NIZAMI_FEAST">("ROYAL_DAAWAT");

  // Scheduling (Default: Tomorrow at 13:00)
  const [defaultDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(13, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [eventDateTime, setEventDateTime] = useState<string>(defaultDateStr);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(outlets[0]?.id || "");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // Live Calculated Quote
  const quote = useMemo(() => {
    const eventDate = new Date(eventDateTime);
    const validDate = isNaN(eventDate.getTime()) ? new Date(defaultDateStr) : eventDate;

    const req: CateringRequirements = {
      guestCount,
      vegPercentage,
      biryaniChoice,
      packageTier,
      eventDateTime: validDate,
    };
    return calculateCateringQuote(req);
  }, [guestCount, vegPercentage, biryaniChoice, packageTier, eventDateTime, defaultDateStr]);

  async function handleBookCatering(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 10) {
      setError("Please provide a detailed delivery address (at least 10 characters).");
      return;
    }

    if (!quote.isValidLeadTime) {
      setError(
        `Catering orders require at least ${quote.minLeadTimeHours} hours advance notice. Selected slot is in ${quote.leadTimeHours} hours.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestJson<{ order: { id: string; orderNumber: string } }>(
        "/api/catering/order",
        {
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
        },
      );

      router.push(`/orders/${res.order.id}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-16">
      {/* Hero Header */}
      <header className="mb-8 overflow-hidden rounded-[2rem] bg-[#133d34] text-white shadow-sm">
        <div className="grid sm:grid-cols-[1.2fr_0.8fr]">
          <div className="px-7 py-10 sm:px-10 sm:py-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#f4d6a9]">
              Bulk & Party Catering · Direct from Kitchen
            </p>
            <h1 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Authentic Dum Handis for Your Celebration.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-stone-200">
              Freshly sealed 5kg, 10kg & 20kg clay pot biryani with royal accompaniments. Zero aggregator commissions.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-[#f4d6a9]">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Sealed Clay Dum Handis
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> 15 to 500 Guests
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> 5% Inclusive GST
              </span>
            </div>
          </div>
          <div className="relative hidden min-h-64 sm:block">
            <Image
              src="/menu/chicken-biryani.jpg"
              alt="Party dum handi biryani"
              fill
              sizes="(min-width: 1024px) 450px, 40vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#133d34] to-transparent" />
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout: Form Wizard + Live Quote Card */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        {/* Wizard Form */}
        <form onSubmit={handleBookCatering} className="space-y-6">
          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Section 1: Headcount & Dietary Split */}
          <section className="rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4d3f1] bg-[#f5effa] text-[#4a1d5a]">
                <Users className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-[#133d34]">1. Guest Count & Dietary Ratio</h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="guest-slider" className="text-sm font-bold text-[#25221e]">
                    Total Number of Guests: <span className="text-[#133d34] font-black text-base">{guestCount}</span>
                  </label>
                  <span className="text-xs text-[#635b50]">Min {MIN_CATERING_GUESTS} · Max {MAX_CATERING_GUESTS}</span>
                </div>
                <input
                  id="guest-slider"
                  type="range"
                  min={MIN_CATERING_GUESTS}
                  max={MAX_CATERING_GUESTS}
                  step={5}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-[#ded5c6] accent-[#133d34] cursor-pointer"
                />
              </div>

              {/* Quick Guest Selector Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[15, 25, 50, 75, 100, 150, 200].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setGuestCount(count)}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition cursor-pointer ${
                      guestCount === count
                        ? "bg-[#133d34] text-white shadow-xs"
                        : "bg-[#f5efe5] text-[#544d42] border border-[#ded5c6] hover:bg-[#ede3f5]"
                    }`}
                  >
                    {count} Guests
                  </button>
                ))}
              </div>

              {/* Dietary Split */}
              <div className="pt-4 border-t border-[#ede6da]">
                <div className="flex justify-between items-center mb-2 text-sm font-semibold">
                  <span>Dietary Ratio:</span>
                  <span className="text-xs">
                    <strong className="text-emerald-700">{quote.vegCount} Veg</strong> ({vegPercentage}%) ·{" "}
                    <strong className="text-red-700">{quote.nonVegCount} Non-Veg</strong> ({100 - vegPercentage}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={vegPercentage}
                  onChange={(e) => setVegPercentage(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-[#ded5c6] accent-[#3b1747] cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Biryani Choices & Package Tier */}
          <section className="rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4d3f1] bg-[#f5effa] text-[#4a1d5a]">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-[#133d34]">2. Biryani Choice & Feast Package</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#25221e] mb-2">Non-Veg Biryani Recipe</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "CHICKEN", label: "Chicken Dum Biryani", sub: "Signature authentic dum" },
                    { id: "MUTTON", label: "Mutton Dum Biryani", sub: "Kache gosht ki dum" },
                    { id: "MIXED", label: "Both Chicken & Mutton", sub: "50/50 Handi split" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBiryaniChoice(b.id as typeof biryaniChoice)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        biryaniChoice === b.id
                          ? "border-[#133d34] bg-[#eef6f4] shadow-xs"
                          : "border-[#ded5c6] bg-[#fffdfa] hover:border-[#4a1d5a]"
                      }`}
                    >
                      <p className="text-xs font-bold text-[#133d34]">{b.label}</p>
                      <p className="text-[11px] text-[#635b50] mt-0.5">{b.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Tiers */}
              <div className="pt-4 border-t border-[#ede6da]">
                <label className="block text-sm font-bold text-[#25221e] mb-2">Package Level</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPackageTier("ROYAL_DAAWAT")}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      packageTier === "ROYAL_DAAWAT"
                        ? "border-[#133d34] bg-[#eef6f4] shadow-xs"
                        : "border-[#ded5c6] bg-[#fffdfa] hover:border-[#4a1d5a]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#133d34]">Royal Daawat</span>
                      <span className="text-xs font-bold text-[#4a1d5a]">Standard</span>
                    </div>
                    <p className="text-xs text-[#635b50] mt-1">
                      Includes Dum Biryani Handis, Mirchi Ka Salan, Burani Raita & Shahi Double Ka Meetha.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPackageTier("NIZAMI_FEAST")}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      packageTier === "NIZAMI_FEAST"
                        ? "border-[#3b1747] bg-[#faf6fd] shadow-xs"
                        : "border-[#ded5c6] bg-[#fffdfa] hover:border-[#4a1d5a]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#3b1747]">Nizami Feast</span>
                      <span className="text-xs font-bold text-[#4a1d5a]">+₹80 / guest</span>
                    </div>
                    <p className="text-xs text-[#635b50] mt-1">
                      Royal Daawat PLUS Shahi Mutton Haleem / Paneer Tikka platter and Rose Gulab Jamuns.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Event Scheduling & Outlet Assignment */}
          <section className="rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4d3f1] bg-[#f5effa] text-[#4a1d5a]">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-[#133d34]">3. Event Scheduling & Kitchen Outlet</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-[#25221e] mb-1">
                  Event Date & Serving Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={eventDateTime}
                  onChange={(e) => setEventDateTime(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#ded5c6] bg-[#fffdfa] px-3 text-sm text-[#25221e] outline-none focus:border-[#133d34] focus:ring-2 focus:ring-[#f5effa]"
                />
                <p className="mt-1 text-xs text-[#635b50]">
                  Requires min 4h preparation window. Lead time: <strong>{quote.leadTimeHours}h</strong>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#25221e] mb-1">
                  Assigned Kitchen Outlet
                </label>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#ded5c6] bg-[#fffdfa] px-3 text-sm text-[#25221e] outline-none focus:border-[#133d34] focus:ring-2 focus:ring-[#f5effa]"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.city}) {o.isCloudKitchen ? "· Cloud Kitchen" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#635b50]">
                  Order routes straight to this outlet&apos;s kitchen display.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#ede6da] space-y-3">
              <div>
                <label className="block text-sm font-bold text-[#25221e] mb-1">
                  Venue Delivery Address
                </label>
                <textarea
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Banquet hall, apartment community hall, or residence address with landmark"
                  className="w-full rounded-xl border border-[#ded5c6] bg-[#fffdfa] p-3 text-sm text-[#25221e] outline-none focus:border-[#133d34] focus:ring-2 focus:ring-[#f5effa]"
                />
              </div>

              <InputField
                label="Special Catering Instructions (Optional)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Please deliver by 12:45 PM for 1:00 PM lunch; mild spice for children."
              />
            </div>
          </section>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !quote.isValidLeadTime}
            className="w-full min-h-14 text-base font-bold shadow-md"
          >
            {submitting ? "Booking catering order…" : `Confirm Party Catering · ${formatMoney(quote.totalPaise)}`}
            <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
        </form>

        {/* Live Quote & Handi Allocation Sidebar */}
        <aside className="sticky top-6 rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#ede6da]">
            <h3 className="font-bold text-base text-[#133d34]">Party Catering Summary</h3>
            <span className="rounded-full border border-[#e4d3f1] bg-[#f5effa] px-2.5 py-0.5 text-xs font-bold text-[#4a1d5a]">
              {quote.guestCount} Guests
            </span>
          </div>

          {/* Handis Allocation Breakdown */}
          <div className="my-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4a1d5a]">
              Calculated Clay Dum Handis
            </p>
            <ul className="space-y-2">
              {quote.handis.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between rounded-xl border border-[#ede6da] bg-[#faf8f4] p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#25221e] block">{h.name}</span>
                    <span className="text-[#635b50]">
                      {h.quantity} × {h.handiSizeKg} kg · Serves ~{h.servesGuests} guests
                    </span>
                  </div>
                  <span className="font-extrabold text-[#133d34] shrink-0">
                    {formatMoney(h.totalPricePaise)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Included Accompaniments */}
          <div className="my-4 pt-3 border-t border-[#ede6da]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4a1d5a] mb-2">
              Complimentary Accompaniments
            </p>
            <ul className="space-y-1.5 text-xs text-[#544d42]">
              {quote.accompaniments.map((acc, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{acc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-4 border-t border-[#ede6da] space-y-2 text-xs">
            <div className="flex justify-between text-[#635b50]">
              <span>Subtotal</span>
              <span>{formatMoney(quote.subtotalPaise)}</span>
            </div>
            {quote.bulkDiscountPaise > 0 && (
              <div className="flex justify-between font-bold text-[#4a1d5a]">
                <span>Bulk Celebration Savings</span>
                <span>−{formatMoney(quote.bulkDiscountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#635b50]">
              <span>Delivery & Clay Pot Packaging</span>
              <span className="font-semibold text-emerald-800">Included (Free)</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#ede6da] text-base font-extrabold text-[#133d34]">
              <span>Total to Pay</span>
              <span>{formatMoney(quote.totalPaise)}</span>
            </div>
            <p className="text-[11px] text-[#635b50] pt-1">
              Includes 5% GST: {formatMoney(quote.includedTaxPaise)} (CGST {formatMoney(quote.cgstPaise)} + SGST{" "}
              {formatMoney(quote.sgstPaise)}). All prices verified and fixed.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-800 shrink-0" />
            <span>Guaranteed sealed handis. Dispatched directly from our kitchen team.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
