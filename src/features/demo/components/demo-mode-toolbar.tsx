"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  RotateCcw,
  ShoppingCart,
  ChefHat,
  ShieldAlert,
  Flame,
  Award,
  Trash2,
  FastForward,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  X,
  Loader2,
  Check,
  Info,
  PartyPopper,
  MessageSquare,
  TicketPercent,
} from "lucide-react";
import type { Viewer } from "@/features/auth/policy";
import { roleLabels } from "@/features/auth/roles";
import { useAlert } from "@/components/ui/alert-toast";
import { Modal } from "@/components/ui/modal";
import { FloatingBlobModal } from "@/components/ui/floating-blob-modal";

interface DemoModeToolbarProps {
  viewer: Viewer;
}

function DemoModInfo({
  whatItDoes,
  whatItTests,
  align = "right",
}: {
  whatItDoes: string;
  whatItTests: string;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }
        }}
        className="group/info inline-flex items-center gap-1 rounded-full border border-[#d5c7b3] bg-[#fbf8f2]/90 px-2 py-0.5 text-[10px] font-bold text-[#695d4d] transition-all hover:border-[#0f352d] hover:bg-[#0f352d] hover:text-white cursor-help shadow-2xs select-none"
        aria-label="Hover for details on what this mode does and tests"
        title="Hover to view what this mode does and what it tests"
      >
        <Info className="h-3 w-3 text-[#c99b53] group-hover/info:text-white transition-colors" />
        <span className="underline decoration-dotted decoration-[#c99b53] underline-offset-2">
          info (hover)
        </span>
      </span>

      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 z-50 w-72 sm:w-80 rounded-2xl border border-[#dec9ec] bg-white/98 backdrop-blur-md p-3.5 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2 text-[11px] leading-relaxed text-[#2b241a]">
            <div>
              <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-[#0f352d]">
                <span>🎯 What this mode does</span>
              </span>
              <p className="mt-0.5 text-[#443c33] leading-normal">{whatItDoes}</p>
            </div>
            <div className="border-t border-[#f0e7d8] pt-1.5">
              <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-[#4a1d5a]">
                <span>🧪 What it tests</span>
              </span>
              <p className="mt-0.5 text-[#443c33] leading-normal">{whatItTests}</p>
            </div>
          </div>
          <div
            className={`absolute -bottom-1.5 h-3 w-3 rotate-45 border-b border-r border-[#dec9ec] bg-white ${
              align === "right" ? "right-5" : "left-5"
            }`}
          />
        </div>
      )}
    </div>
  );
}

export function DemoModeToolbar({ viewer }: DemoModeToolbarProps) {
  const router = useRouter();
  const alert = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<{
    earnRupeesPerPoint: number;
    redeemPaisePerPoint: number;
    maxRebatePercent: number;
  }>({
    earnRupeesPerPoint: 10,
    redeemPaisePerPoint: 50,
    maxRebatePercent: 50,
  });

  const fetchLoyaltySettings = useCallback(() => {
    fetch("/api/demo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.loyaltySettings) {
          setLoyaltySettings(data.loyaltySettings);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLoyaltySettings();
    window.addEventListener("focus", fetchLoyaltySettings);
    window.addEventListener("loyalty:settings-updated", fetchLoyaltySettings);
    return () => {
      window.removeEventListener("focus", fetchLoyaltySettings);
      window.removeEventListener("loyalty:settings-updated", fetchLoyaltySettings);
    };
  }, [fetchLoyaltySettings]);

  useEffect(() => {
    if (isOpen) {
      fetchLoyaltySettings();
    }
  }, [isOpen, fetchLoyaltySettings]);

  const ptsToRupees = useCallback(
    (pts: number) => {
      return Math.floor((pts * loyaltySettings.redeemPaisePerPoint) / 100);
    },
    [loyaltySettings.redeemPaisePerPoint],
  );

  const setMenuOpen = useCallback((nextOpen: boolean) => {
    setIsOpen(nextOpen);
  }, []);

  // Universal Reset Action for ALL ROLES (executed after custom modal confirmation)
  async function executeResetDemo() {
    setActiveAction("reset");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset demo");

      // Also reset client cart if any
      sessionStorage.removeItem(`restaurant-system:cart:${viewer.id}`);
      window.dispatchEvent(new Event("demo:cart-sync"));

      alert.success("Demo Reset Complete", "The database and sample metrics have been restored to baseline.");
      setMenuOpen(false);

      // Full reload so all pages & client states freshly hydrate
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      alert.failure("Reset Failed", err instanceof Error ? err.message : "Network error");
    } finally {
      setActiveAction(null);
    }
  }

  // Generic demo action caller
  async function callDemoAction(payload: Record<string, unknown>, successTitle: string, successMsg: string) {
    const actionKey =
      payload.action === "set-loyalty"
        ? `set-loyalty-${payload.points}`
        : String(payload.action);
    setActiveAction(actionKey);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Action failed");

      alert.success(successTitle, data.message || successMsg);
      setMenuOpen(false);

      // Navigate to redirectUrl if returned (e.g. live order tracker), else full reload to sync all states
      setTimeout(() => {
        if (typeof data.redirectUrl === "string" && data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          window.location.reload();
        }
      }, 600);
    } catch (err) {
      alert.failure("Action Failed", err instanceof Error ? err.message : "Error executing action");
    } finally {
      setActiveAction(null);
    }
  }

  // --- Customer Cart Helpers ---
  function seedCustomerCart(
    name: string,
    lines: { portionId: string; addonIds: string[]; quantity: number }[],
  ) {
    try {
      const cartState = {
        outletId: "outlet-kondapur",
        location: {
          latitude: 17.4622,
          longitude: 78.3568,
        },
        lines,
      };
      sessionStorage.setItem(`restaurant-system:cart:${viewer.id}`, JSON.stringify(cartState));
      window.dispatchEvent(new Event("demo:cart-sync"));
      alert.success("Cart Updated", `Loaded ${name} into your active cart!`);
      setMenuOpen(false);

      // If user is not on order or checkout, navigate them to order page
      if (!window.location.pathname.startsWith("/order") && !window.location.pathname.startsWith("/checkout")) {
        router.push("/order");
      } else {
        router.refresh();
      }
    } catch {
      alert.failure("Cart Error", "Could not write to local storage.");
    }
  }

  function clearCustomerCart() {
    try {
      const cartState = {
        outletId: null,
        location: null,
        lines: [],
      };
      sessionStorage.setItem(`restaurant-system:cart:${viewer.id}`, JSON.stringify(cartState));
      window.dispatchEvent(new Event("demo:cart-sync"));
      alert.general("Cart Cleared", "Customer cart has been emptied.");
      setMenuOpen(false);
      router.refresh();
    } catch {
      alert.failure("Cart Error", "Could not clear storage.");
    }
  }

  return (
    <>
      <FloatingBlobModal
        id="demo-mode-toolbar"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        anchorClassName="fixed bottom-[calc(9.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 lg:bottom-6 lg:right-6"
        contentClassName="w-[calc(100vw-2rem)] sm:w-[440px] max-h-[78vh]"
        ariaLabel="Demo Action Controls"
        trigger={({ isOpen: isBtnOpen, toggle, buttonRef }) => (
          <button
            ref={buttonRef}
            type="button"
            onClick={toggle}
            className="group relative z-30 flex items-center gap-2 rounded-full border border-[#c99b53]/60 bg-[#0f352d] px-4 py-2.5 text-xs font-bold text-[#faf7f2] shadow-[0_6px_24px_rgba(15,53,45,0.45)] transition-colors duration-300 hover:bg-[#14453a] hover:border-[#c99b53] focus:outline-none focus:ring-2 focus:ring-[#c99b53] focus:ring-offset-2"
            aria-expanded={isBtnOpen}
            aria-label="Toggle Demo Action Menu"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c99b53] text-[#0f352d] shadow-2xs">
              <Zap className="h-3 w-3 fill-current" />
            </span>
            <span className="font-semibold tracking-wide">Demo Modes</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-[#f4d6a9]">
              {roleLabels[viewer.role]}
            </span>
          </button>
        )}
      >
        {/* Top Royal Ribbon Accent */}
              <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#0f352d] via-[#c99b53] to-[#3b1747]" />

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#e5dbc9]/80 bg-[#faf7f2]/85 backdrop-blur-md px-5 py-3.5 text-[#0f352d]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c99b53] text-[#0f352d] shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-[#0f352d]">
                      Demo Testing Lab
                    </h2>
                    <p className="text-[11px] text-[#6b6051]">
                      Role: <strong className="font-semibold text-[#4a1d5a]">{roleLabels[viewer.role]}</strong> ({viewer.name})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full p-1.5 text-[#716556] transition hover:bg-black/5 hover:text-[#0f352d]"
                  aria-label="Close demo lab"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Scrollable Action Content */}
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-xs text-[#2b241a]">
            {/* --- CUSTOMER ROLE ACTIONS --- */}
            {viewer.role === "CUSTOMER" && (
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#4a1d5a]">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Instant Cart Seeders</span>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#716556]">
                    Fill cart immediately to test coupons, discounts, and payment flows.
                  </p>
                </div>

                <div className="grid gap-2.5">
                  <div className="rounded-2xl border border-[#dec9ec]/80 bg-[#fdfaff]/90 p-3 transition hover:border-[#3b1747] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#3b1747]">
                        ⚡ Seed Solo Feast (₹510)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Populates cart with 1 Chicken Dum Biryani Regular + 1 Frappé Cold Coffee at Kondapur Outlet."
                        whatItTests="Tests single-item checkout flow, cross-category pairing (Biryani + Beverage), and real-time subtotal/tax calculations."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Chicken Dum Biryani + Frappé Cold Coffee
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        seedCustomerCart("Solo Feast (₹510)", [
                          { portionId: "portion-chicken-regular", addonIds: [], quantity: 1 },
                          { portionId: "portion-cold-coffee-regular", addonIds: [], quantity: 1 },
                        ])
                      }
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3b1747] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#4a1d5a]"
                    >
                      <span>Apply to Cart</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#e5dbc9]/90 bg-white/90 p-3 transition hover:border-[#0f352d] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#0f352d]">
                        ⚡ Seed Family Dawat (₹2,020)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Fills cart with Mutton Family Pack, Extra Raita, Chicken 65, 4 Rumali Rotis, 2 Meetha, and Mint Mojito."
                        whatItTests="Tests multi-item cart limit checks, addon price summation, multi-quantity increments, and high-value orders."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Mutton Family Pack + Chicken 65 + 4 Rotis + Meetha + Mojito
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        seedCustomerCart("Family Dawat (₹2,020)", [
                          { portionId: "portion-mutton-family", addonIds: ["addon-mutton-raita"], quantity: 1 },
                          { portionId: "portion-chicken65-regular", addonIds: [], quantity: 1 },
                          { portionId: "portion-rumali-regular", addonIds: [], quantity: 2 },
                          { portionId: "portion-meetha", addonIds: [], quantity: 2 },
                          { portionId: "portion-mojito-regular", addonIds: [], quantity: 1 },
                        ])
                      }
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f352d] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#15463b]"
                    >
                      <span>Apply to Cart</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#fed7aa]/90 bg-[#fffbf5]/90 p-3 transition hover:border-[#ea580c] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#9a3412]">
                        🧪 Seed Coupon Deficit Cart (₹270)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Adds Bagara Baingan (₹220) and Rumali Roti (₹50) totalling ₹270, strictly below the ₹300 coupon threshold."
                        whatItTests="Tests dynamic deficit calculation: displays 'Add ₹30 to unlock DIRECT10' banner and enforces threshold gating at checkout."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Tests &ldquo;Add ₹30 to unlock DIRECT10&rdquo; minimum order deficit banner.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        seedCustomerCart("Deficit Tester (₹270)", [
                          { portionId: "portion-bagara-baingan-regular", addonIds: [], quantity: 1 },
                          { portionId: "portion-rumali-regular", addonIds: [], quantity: 1 },
                        ])
                      }
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#c2410c] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#9a3412]"
                    >
                      <span>Apply Deficit Cart</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#e5dbc9] bg-white/80 p-2.5">
                    <button
                      type="button"
                      onClick={clearCustomerCart}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#8a2525] transition hover:text-[#5a1515]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Empty Customer Cart</span>
                    </button>
                    <DemoModInfo
                      whatItDoes="Clears customer sessionStorage cart and notifies all active tabs via demo:cart-sync."
                      whatItTests="Tests empty cart placeholder UI, cart count badge removal, and checkout page redirect guards when cart is empty."
                    />
                  </div>
                </div>

                {/* Loyalty Points Injector (Relative to Admin-Configured Redemption Rate) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#0f352d]">
                      <Award className="h-3.5 w-3.5" />
                      <span>Loyalty Points Balance</span>
                    </h3>
                    <DemoModInfo
                      whatItDoes={`Sets customer loyalty account points to 0, 500 (₹${ptsToRupees(500)}), or 1,500 (₹${ptsToRupees(1500)}) points based on the current admin loyalty configuration.`}
                      whatItTests={`Tests points redemption relative to admin rate (${loyaltySettings.redeemPaisePerPoint} paise/pt = ₹${ptsToRupees(500)} per 500 pts), discount caps (${loyaltySettings.maxRebatePercent}% max), and checkout billing calculation.`}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#716556]">
                    Set points balance to test discount checkboxes at checkout (admin rate: {loyaltySettings.redeemPaisePerPoint}p/pt).
                  </p>

                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "set-loyalty", points: 0 },
                          "Points Set to 0",
                          "Loyalty balance reset to 0 points.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="rounded-xl border border-[#e5dbc9] bg-white py-2 font-bold text-[#554b3f] transition hover:bg-[#f6f1e7]"
                    >
                      0 pts (₹0)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "set-loyalty", points: 500 },
                          "Points Set to 500",
                          `Loyalty balance set to 500 points (₹${ptsToRupees(500).toLocaleString("en-IN")} discount).`,
                        )
                      }
                      disabled={activeAction !== null}
                      className="rounded-xl border border-[#c99b53]/50 bg-[#fbf7f0] py-2 font-bold text-[#8f6d35] transition hover:border-[#c99b53]"
                    >
                      500 pts (₹{ptsToRupees(500).toLocaleString("en-IN")})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "set-loyalty", points: 1500 },
                          "Points Set to 1,500",
                          `Loyalty balance set to 1,500 points (₹${ptsToRupees(1500).toLocaleString("en-IN")} discount).`,
                        )
                      }
                      disabled={activeAction !== null}
                      className="rounded-xl border border-[#0f352d]/40 bg-[#eef7f4] py-2 font-bold text-[#0f352d] transition hover:border-[#0f352d]"
                    >
                      1,500 pts (₹{ptsToRupees(1500).toLocaleString("en-IN")})
                    </button>
                  </div>
                </div>

                {/* 1-Click Live Order & Party Catering Simulators */}
                <div className="pt-2 space-y-2.5">
                  <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#0f352d]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Live Order & Catering Simulators</span>
                  </h3>

                  <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5]/90 p-3 transition hover:border-[#059669] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#065f46]">
                        🚀 1-Click Live Order + WhatsApp Outbox
                      </strong>
                      <DemoModInfo
                        whatItDoes="Creates a paid live order (#DEMO-LIVE-*) with Gemini AI prep estimation, credits Royal Rewards points, and dispatches WhatsApp & SMS alerts."
                        whatItTests="Tests live order tracker (/orders/[id]), AI ETA explanation card, append-only loyalty ledger, and the Mock WhatsApp/SMS Device Outbox."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#554b3f]">
                      Places instant paid order &amp; opens live tracker with Mock WhatsApp/SMS Outbox.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "place-demo-customer-order" },
                          "Live Order Created",
                          "Redirecting to live order tracker & WhatsApp outbox...",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50"
                    >
                      {activeAction === "place-demo-customer-order" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                      <span>Place Instant Live Order &amp; Track</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#dec9ec] bg-[#faf5ff]/90 p-3 transition hover:border-[#6b21a8] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#4a1d5a]">
                        🎉 Submit 60-Guest Party Catering Request
                      </strong>
                      <DemoModInfo
                        whatItDoes="Creates a 60-guest Corporate Daawat bulk catering booking (₹28,500) in PENDING_CONFIRMATION state at Kondapur."
                        whatItTests="Tests bulk party catering workflow, Catering Manager confirmation lock gate on KDS, and 30% margin tracking."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Simulates bulk event booking awaiting Catering Manager approval.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          {
                            action: "inject-catering-booking",
                            outletId: "outlet-kondapur",
                            autoConfirm: false,
                            guestCount: 60,
                          },
                          "Party Catering Submitted",
                          "Created 60-guest catering booking pending manager confirmation.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#4a1d5a] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#3b1747] disabled:opacity-50"
                    >
                      {activeAction === "inject-catering-booking" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PartyPopper className="h-3.5 w-3.5" />
                      )}
                      <span>Book 60-Guest Party Catering</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- KITCHEN STAFF ROLE ACTIONS --- */}
            {viewer.role === "KITCHEN_STAFF" && (
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#0f352d]">
                    <ChefHat className="h-3.5 w-3.5" />
                    <span>Live Kitchen Board Simulator</span>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#716556]">
                    Inject rush tickets, force SLA breach alerts, and advance stages.
                  </p>
                </div>

                <div className="grid gap-2.5">
                  <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]/90 p-3 transition hover:border-[#16a34a] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#166534]">
                        ⚡ Simulate Incoming Rush (+3 Tickets)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Generates 3 new paid customer tickets across Biryani, Grill, Curry, and Beverage stations at your current outlet."
                        whatItTests="Tests live KDS queue ingestion, real-time ticket counter increments, and multi-station station tag routing."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Orders across Biryani, Grill, Curry & Beverage stations.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "simulate-kitchen-rush", count: 3 },
                          "Rush Tickets Dispatched",
                          "Injected 3 new multi-station tickets to your kitchen queue.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#166534] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#14532d] disabled:opacity-50"
                    >
                      {activeAction === "simulate-kitchen-rush" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Flame className="h-3.5 w-3.5" />
                      )}
                      <span>Dispatch 3 Tickets</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2]/90 p-3 transition hover:border-[#dc2626] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#991b1b]">
                        🚨 Force SLA Breach (15m Overdue)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Injects a ticket whose promised ready time is set 15 minutes in the past (now - 15 mins)."
                        whatItTests="Tests urgent red pulsating overdue styling, supervisor escalation alert cards, and lateness calculator algorithms."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Tests red pulsating overdue indicator & kitchen supervisor alerts.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "force-kitchen-sla-breach" },
                          "SLA Breach Injected",
                          "Added ticket with promised time 15 mins ago to test alert flags.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#b91c1c] disabled:opacity-50"
                    >
                      {activeAction === "force-kitchen-sla-breach" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      <span>Inject Overdue Ticket</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#e5dbc9] bg-white/90 p-3 transition hover:border-[#0f352d] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#0f352d]">
                        ⏩ Fast-Forward Active Tickets
                      </strong>
                      <DemoModInfo
                        whatItDoes="Advances all NEW tickets to PREPARING, or PREPARING tickets to READY via atomic stage updates."
                        whatItTests="Tests kitchen state transitions (NEW -> PREPARING -> READY), automated OrderEvent audit logs, and board column shifts."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Advances NEW &rarr; PREPARING or PREPARING &rarr; READY in 1-click.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "advance-kitchen-batch" },
                          "Stage Advanced",
                          "Moved active tickets to next preparation stage.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f352d] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#15463b] disabled:opacity-50"
                    >
                      {activeAction === "advance-kitchen-batch" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FastForward className="h-3.5 w-3.5" />
                      )}
                      <span>Advance to Next Stage</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#dec9ec] bg-[#fcfaff]/90 p-3 transition hover:border-[#3b1747] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#3b1747]">
                        📦 Hand Off All Ready Orders
                      </strong>
                      <DemoModInfo
                        whatItDoes="Marks all READY orders as HANDED_OFF with completion timestamps."
                        whatItTests="Tests board archiving, queue clearing, and delivery handoff status notifications."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Clears the board by archiving finished orders.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "complete-kitchen-ready" },
                          "Tickets Handed Off",
                          "Marked all READY orders as handed off.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3b1747] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#4a1d5a] disabled:opacity-50"
                    >
                      {activeAction === "complete-kitchen-ready" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Archive Ready Tickets</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#fed7aa] bg-[#fffbf5]/90 p-3 transition hover:border-[#ea580c] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#9a3412]">
                        🚫 Toggle 86 (Stockout) Mutton Biryani
                      </strong>
                      <DemoModInfo
                        whatItDoes="Toggles isAvailable flag for Mutton Dum Biryani in OutletAvailability."
                        whatItTests="Tests real-time 86 stock controls: disables dish on customer menu instantly and blocks cart additions."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Instantly mark item out of stock to test live customer menu reflection.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "toggle-dish-stockout", itemId: "item-mutton-biryani" },
                          "Stock Status Toggled",
                          "Toggled 86 availability for Mutton Dum Biryani.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#ea580c] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#c2410c] disabled:opacity-50"
                    >
                      {activeAction === "toggle-dish-stockout" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      <span>Toggle Mutton Biryani Stock</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#dec9ec] bg-[#faf5ff]/90 p-3 transition hover:border-[#6b21a8] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#4a1d5a]">
                        🎉 Inject 75-Guest VIP Catering Ticket
                      </strong>
                      <DemoModInfo
                        whatItDoes="Injects an unconfirmed 75-guest VIP Banquet Catering order (₹28,500) into your kitchen queue."
                        whatItTests="Tests the KDS Catering Lock Gate: blocks stage advancement until confirmed by the Catering Manager."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Tests KDS catering confirmation lock &amp; manager approval modal.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          {
                            action: "inject-catering-booking",
                            autoConfirm: false,
                            guestCount: 75,
                          },
                          "VIP Catering Ticket Injected",
                          "Added 75-guest catering order pending manager confirmation.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#4a1d5a] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#3b1747] disabled:opacity-50"
                    >
                      {activeAction === "inject-catering-booking" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PartyPopper className="h-3.5 w-3.5" />
                      )}
                      <span>Inject Pending Catering Ticket</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5]/90 p-3 transition hover:border-[#059669] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#065f46]">
                        ✅ Auto-Approve Pending Catering Bookings
                      </strong>
                      <DemoModInfo
                        whatItDoes="Confirms all PENDING_CONFIRMATION catering orders at your outlet (or creates and confirms one if none are pending)."
                        whatItTests="Tests Catering Manager confirmation workflow, unlocks kitchen prep stages, and fires WhatsApp/SMS confirmation notices."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Unlocks pending party handi orders for active kitchen preparation.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "approve-pending-catering" },
                          "Catering Bookings Confirmed",
                          "Approved pending catering orders and unlocked KDS stages.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50"
                    >
                      {activeAction === "approve-pending-catering" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Confirm All Pending Catering</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- CENTRAL ADMIN ROLE ACTIONS --- */}
            {viewer.role === "CENTRAL_ADMIN" && (
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#0f352d]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Executive Dashboard Simulations</span>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#716556]">
                    Populate financial calculators, test cancellation risk, and pause kitchens.
                  </p>
                </div>

                <div className="grid gap-2.5">
                  <div className="rounded-2xl border border-[#c99b53]/40 bg-[#fdfbf7]/90 p-3 transition hover:border-[#c99b53] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#8f6d35]">
                        📊 Inject 50 Historical Orders
                      </strong>
                      <DemoModInfo
                        whatItDoes="Seeds 50 completed orders distributed across all 17 outlets over the past 14 days with direct vs aggregator split."
                        whatItTests="Tests Executive Dashboard analytics charts, aggregator commission savings simulation, and repeat customer retention rate calculations."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Demonstrates direct vs aggregator commissions, savings & repeat rates.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "inject-admin-analytics", count: 50 },
                          "50 Orders Injected",
                          "Populated historical orders across 17 outlets for charts and savings metrics.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8f6d35] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#725424] disabled:opacity-50"
                    >
                      {activeAction === "inject-admin-analytics" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TrendingUp className="h-3.5 w-3.5" />
                      )}
                      <span>Inject 50 Sample Orders</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2]/90 p-3 transition hover:border-[#dc2626] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#991b1b]">
                        ⚠️ Trigger Cancellation Spike Alert
                      </strong>
                      <DemoModInfo
                        whatItDoes="Simulates 4 rapid order cancellations within the last 15 minutes."
                        whatItTests="Tests real-time operational risk banner on the Executive Dashboard, alerting admins to abnormal kitchen cancellation spikes."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Fires real-time operational risk warning banner on dashboard.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "trigger-cancellation-spike", outletId: "outlet-kondapur" },
                          "Cancellation Spike Triggered",
                          "Added 4 rapid cancellations to demonstrate risk alerts on dashboard.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#b91c1c] disabled:opacity-50"
                    >
                      {activeAction === "trigger-cancellation-spike" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      <span>Trigger Cancellation Spike</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#e5dbc9] bg-white/90 p-3 transition hover:border-[#0f352d] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#0f352d]">
                        ⏸️ Pause / Resume Kondapur Kitchen
                      </strong>
                      <DemoModInfo
                        whatItDoes="Toggles isActive flag on the Kondapur flagship outlet."
                        whatItTests="Tests emergency kitchen pause banner, customer out-of-service notices, and automated failover delivery routing to Gachibowli cloud kitchen."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Tests automatic failover to Gachibowli cloud kitchen.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "toggle-outlet-active", outletId: "outlet-kondapur" },
                          "Outlet Status Toggled",
                          "Toggled active/paused status for Kondapur kitchen.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f352d] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#15463b] disabled:opacity-50"
                    >
                      {activeAction === "toggle-outlet-active" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5" />
                      )}
                      <span>Toggle Kitchen Active Status</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#dec9ec] bg-[#faf5ff]/90 p-3 transition hover:border-[#6b21a8] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#4a1d5a]">
                        🎉 Inject 120-Guest Banquet Catering (₹45,000)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Injects a confirmed 120-guest Corporate Banquet order (₹45,000 GMV, capturing ₹13,500 net 30% catering margin)."
                        whatItTests="Tests Executive Dashboard Bulk Catering Margin KPI, ₹1.14 Cr annual savings progress bar, and high-ticket KDS routing."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Adds ₹45,000 catering GMV (+₹13,500 net margin at 30%) to analytics.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          {
                            action: "inject-catering-booking",
                            outletId: "outlet-kondapur",
                            autoConfirm: true,
                            guestCount: 120,
                          },
                          "Banquet Catering Injected",
                          "Added ₹45,000 confirmed catering banquet (+₹13,500 net margin).",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#4a1d5a] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#3b1747] disabled:opacity-50"
                    >
                      {activeAction === "inject-catering-booking" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PartyPopper className="h-3.5 w-3.5" />
                      )}
                      <span>Inject ₹45,000 Catering Banquet</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5]/90 p-3 transition hover:border-[#059669] hover:shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-[#065f46]">
                        🎟️ Launch Flash Festival Coupons (ROYAL25)
                      </strong>
                      <DemoModInfo
                        whatItDoes="Activates two promotional coupons across the chain: ROYAL25 (25% OFF up to ₹250) and NAWABI150 (Flat ₹150 OFF above ₹800)."
                        whatItTests="Tests live coupon campaign management (/admin/coupons) and immediate availability in the customer checkout coupon drawer."
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#716556]">
                      Publishes ROYAL25 (25% OFF) &amp; NAWABI150 (₹150 OFF) for customer checkout.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        callDemoAction(
                          { action: "launch-flash-coupon" },
                          "Flash Coupons Activated",
                          "Published ROYAL25 & NAWABI150 across all outlets.",
                        )
                      }
                      disabled={activeAction !== null}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50"
                    >
                      {activeAction === "launch-flash-coupon" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TicketPercent className="h-3.5 w-3.5" />
                      )}
                      <span>Activate ROYAL25 &amp; NAWABI150</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- UNIVERSAL DEMO RESET (ALWAYS VISIBLE FOR ALL ROLES) --- */}
            <div className="rounded-2xl border-2 border-dashed border-[#dec9ec] bg-gradient-to-br from-[#faf7fc]/95 to-[#f4ebf8]/95 p-4 text-center">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#3b1747]">
                  <RotateCcw className="h-4 w-4" />
                  <span>Universal Demo Baseline Reset</span>
                </div>
                <DemoModInfo
                  whatItDoes="Cleans up all temporary test orders (DEMO-*), resets 86 stockouts to 100% available, and restores demo loyalty balances."
                  whatItTests="Tests repeatable demonstration capability: allows resetting the entire database back to pristine initial state in 1 click."
                />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#5e4b66] text-left">
                Available to <strong>all demo roles</strong>. Clears test-injected tickets, resets stockouts, and restores sample database benchmarks.
              </p>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                disabled={activeAction !== null}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b1747] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#4a1d5a] focus:ring-2 focus:ring-[#c99b53] disabled:opacity-50"
              >
                {activeAction === "reset" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resetting Demo Environment…</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Demo Environment to Clean State</span>
                  </>
                )}
              </button>
            </div>
          </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-[#e5dbc9]/80 bg-[#fbf8f2]/90 px-5 py-2.5 text-[11px] text-[#716556] flex items-center justify-between">
                <span>💡 Live PostgreSQL demo transactions</span>
                <span className="text-[10px] text-[#9c8e7c]">Click outside to close</span>
              </div>
      </FloatingBlobModal>

      {/* CUSTOM LUXURY CONFIRMATION MODAL (NO BROWSER ALERT/CONFIRM) */}
      {showResetConfirmModal && (
        <Modal
          title="Reset Demo Environment?"
          subtitle="Universal Demo Baseline Restore"
          maxWidth="max-w-md"
          onClose={() => setShowResetConfirmModal(false)}
        >
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3 rounded-2xl border border-[#f3d4dc] bg-[#fff5f6] p-4 text-[#721c24]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dc3545] text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="text-xs leading-relaxed">
                <strong className="block font-bold text-[#842029] text-sm">
                  Are you sure you want to restore baseline state?
                </strong>
                <p className="mt-1 text-[#842029]/90">
                  This action will:
                </p>
                <ul className="mt-1.5 list-disc list-inside space-y-1 text-[#6a1a21]">
                  <li>Delete all temporary demo-injected tickets (<code className="font-mono text-[10px] bg-white/70 px-1 py-0.5 rounded">DEMO-*</code>).</li>
                  <li>Re-enable any 86&apos;d out-of-stock items across all 17 outlets.</li>
                  <li>Re-open paused kitchens (e.g. Kondapur flagship).</li>
                  <li>Restore customer demo loyalty accounts to default points.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="rounded-xl border border-[#d5c7b3] bg-white px-4 py-2.5 text-xs font-bold text-[#554b3f] transition hover:bg-[#f6f1e7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  executeResetDemo();
                }}
                className="flex items-center gap-2 rounded-xl bg-[#3b1747] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#4a1d5a]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Yes, Reset to Clean State</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
