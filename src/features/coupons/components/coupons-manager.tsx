"use client";

import { useMemo, useState } from "react";
import {
  Ticket,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Check,
  Edit2,
  Trash2,
  Percent,
  TrendingUp,
  Tag,
  ShieldCheck,
} from "lucide-react";
import type { CouponItem, CouponMetrics } from "../types";
import { Modal } from "@/components/ui/modal";
import { useAlert } from "@/components/ui/alert-toast";
import { cn } from "@/lib/classes";

interface CouponsManagerProps {
  initialCoupons: CouponItem[];
  initialMetrics: CouponMetrics;
}

interface FormState {
  code: string;
  discountType: "PERCENT" | "FLAT";
  value: number;
  minOrderRupees: number;
  maxDiscountRupees: number | string;
  usageLimit: number | string;
  perCustomerLimit: number | string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

const DEFAULT_FORM_STATE: FormState = {
  code: "",
  discountType: "PERCENT",
  value: 10,
  minOrderRupees: 300,
  maxDiscountRupees: 100,
  usageLimit: "",
  perCustomerLimit: 1,
  isActive: true,
  startsAt: new Date().toISOString().slice(0, 16),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
};

function formatRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function getCouponStatus(coupon: CouponItem): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  const now = new Date();
  const expiresAt = new Date(coupon.expiresAt);
  const startsAt = new Date(coupon.startsAt);

  if (!coupon.isActive) {
    return {
      label: "Paused",
      color: "text-amber-800",
      bg: "bg-amber-50",
      border: "border-amber-200",
    };
  }
  if (expiresAt <= now) {
    return {
      label: "Expired",
      color: "text-rose-800",
      bg: "bg-rose-50",
      border: "border-rose-200",
    };
  }
  if (startsAt > now) {
    return {
      label: "Scheduled",
      color: "text-blue-800",
      bg: "bg-blue-50",
      border: "border-blue-200",
    };
  }
  return {
    label: "Active",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  };
}

export function CouponsManager({
  initialCoupons,
  initialMetrics,
}: CouponsManagerProps) {
  const alert = useAlert();
  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons);
  const [metrics, setMetrics] = useState<CouponMetrics>(initialMetrics);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "PAUSED" | "EXPIRED"
  >("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Recalculate quick stats dynamically
  function recalculateMetrics(updated: CouponItem[]): CouponMetrics {
    let totalRedemptions = 0;
    let totalDiscountGivenPaise = 0;
    let activeCoupons = 0;
    let topCouponCode: string | null = null;
    let maxRedemptions = -1;

    for (const c of updated) {
      totalRedemptions += c.redemptionCount;
      totalDiscountGivenPaise += c.totalDiscountGivenPaise;
      if (c.isActive && new Date(c.expiresAt) > new Date()) {
        activeCoupons += 1;
      }
      if (c.redemptionCount > maxRedemptions && c.redemptionCount > 0) {
        maxRedemptions = c.redemptionCount;
        topCouponCode = c.code;
      }
    }

    return {
      totalCoupons: updated.length,
      activeCoupons,
      totalRedemptions,
      totalDiscountGivenPaise,
      topCouponCode,
    };
  }

  // Filtered list
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (
        searchQuery &&
        !coupon.code.toLowerCase().includes(searchQuery.toLowerCase().trim())
      ) {
        return false;
      }

      const status = getCouponStatus(coupon).label.toUpperCase();
      if (statusFilter === "ACTIVE" && status !== "ACTIVE") return false;
      if (statusFilter === "PAUSED" && status !== "PAUSED") return false;
      if (statusFilter === "EXPIRED" && status !== "EXPIRED") return false;

      return true;
    });
  }, [coupons, searchQuery, statusFilter]);

  // Open create modal
  function handleOpenCreate() {
    setEditingCoupon(null);
    setFormData(DEFAULT_FORM_STATE);
    setModalOpen(true);
  }

  // Open edit modal
  function handleOpenEdit(coupon: CouponItem) {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      value:
        coupon.discountType === "PERCENT"
          ? coupon.value
          : coupon.value / 100, // convert paise to ₹
      minOrderRupees: coupon.minOrderPaise / 100,
      maxDiscountRupees:
        coupon.maxDiscountPaise !== null ? coupon.maxDiscountPaise / 100 : "",
      usageLimit: coupon.usageLimit ?? "",
      perCustomerLimit: coupon.perCustomerLimit ?? "",
      isActive: coupon.isActive,
      startsAt: coupon.startsAt.slice(0, 16),
      expiresAt: coupon.expiresAt.slice(0, 16),
    });
    setModalOpen(true);
  }

  // Instant toggle active / inactive switch
  async function handleToggleActive(coupon: CouponItem) {
    const nextActive = !coupon.isActive;
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle status");
      }
      const data = await res.json();
      const updated = coupons.map((c) =>
        c.id === coupon.id ? data.coupon : c,
      );
      setCoupons(updated);
      setMetrics(recalculateMetrics(updated));
      alert.success(
        nextActive ? "Coupon Activated" : "Coupon Paused",
        `Coupon ${coupon.code} is now ${nextActive ? "live and redeemable" : "paused at checkout"}.`,
      );
    } catch (err: unknown) {
      alert.failure(
        "Action Failed",
        err instanceof Error ? err.message : "Unable to update coupon status.",
      );
    }
  }

  // Delete or archive coupon
  async function handleDelete(coupon: CouponItem) {
    const confirmMessage =
      coupon.redemptionCount > 0
        ? `Coupon "${coupon.code}" has ${coupon.redemptionCount} redemptions. Deleting will safely pause/archive it to preserve customer order ledgers. Proceed?`
        : `Are you sure you want to delete coupon "${coupon.code}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete coupon");
      }
      const outcome = await res.json();

      if (outcome.archived) {
        const updated = coupons.map((c) =>
          c.id === coupon.id ? { ...c, isActive: false } : c,
        );
        setCoupons(updated);
        setMetrics(recalculateMetrics(updated));
        alert.general(
          "Coupon Archived",
          `Coupon "${coupon.code}" was paused because existing orders reference it.`,
        );
      } else {
        const updated = coupons.filter((c) => c.id !== coupon.id);
        setCoupons(updated);
        setMetrics(recalculateMetrics(updated));
        alert.success(
          "Coupon Deleted",
          `Coupon "${coupon.code}" has been permanently removed.`,
        );
      }
    } catch (err: unknown) {
      alert.failure(
        "Deletion Failed",
        err instanceof Error ? err.message : "Unable to delete coupon.",
      );
    }
  }

  // Save form (Create or Update)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        value: Number(formData.value),
        minOrderRupees: Number(formData.minOrderRupees) || 0,
        maxDiscountRupees:
          formData.discountType === "PERCENT" && formData.maxDiscountRupees !== ""
            ? Number(formData.maxDiscountRupees)
            : null,
        usageLimit:
          formData.usageLimit !== "" ? Number(formData.usageLimit) : null,
        perCustomerLimit:
          formData.perCustomerLimit !== ""
            ? Number(formData.perCustomerLimit)
            : null,
        isActive: formData.isActive,
        startsAt: new Date(formData.startsAt).toISOString(),
        expiresAt: new Date(formData.expiresAt).toISOString(),
      };

      if (editingCoupon) {
        const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update coupon");
        }
        const data = await res.json();
        const updated = coupons.map((c) =>
          c.id === editingCoupon.id ? data.coupon : c,
        );
        setCoupons(updated);
        setMetrics(recalculateMetrics(updated));
        alert.success(
          "Coupon Updated",
          `Changes to "${payload.code}" have been saved.`,
        );
      } else {
        const res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create coupon");
        }
        const data = await res.json();
        const updated = [data.coupon, ...coupons];
        setCoupons(updated);
        setMetrics(recalculateMetrics(updated));
        alert.success(
          "Coupon Created",
          `New promotional coupon "${payload.code}" is ready.`,
        );
      }

      setModalOpen(false);
    } catch (err: unknown) {
      alert.failure(
        "Save Failed",
        err instanceof Error ? err.message : "Unable to save coupon.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Copy code helper
  function handleCopyCode(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      alert.general("Copied to Clipboard", `Promo code "${code}" copied.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* 4 Quick Stat Cards */}
      <section
        aria-label="Coupon performance overview"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        <div className="rounded-2xl border border-[#e8dfcf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#7a6f60]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Active Coupons
            </span>
            <Ticket className="h-4 w-4 text-[#0f352d]" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-[#0f352d]">
            {metrics.activeCoupons}
            <span className="ml-1 text-xs font-medium text-[#7a6f60]">
              / {metrics.totalCoupons} total
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-[#7a6f60]">
            Ready for customer checkout
          </span>
        </div>

        <div className="rounded-2xl border border-[#e8dfcf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#7a6f60]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Redemptions
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-[#0f352d]">
            {metrics.totalRedemptions}
          </div>
          <span className="mt-1 block text-[11px] text-[#7a6f60]">
            Direct customer orders applied
          </span>
        </div>

        <div className="rounded-2xl border border-[#e8dfcf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#7a6f60]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Discount Given
            </span>
            <TrendingUp className="h-4 w-4 text-[#4a1d5a]" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-[#4a1d5a]">
            {formatRupees(metrics.totalDiscountGivenPaise)}
          </div>
          <span className="mt-1 block text-[11px] text-[#7a6f60]">
            Customer savings delivered
          </span>
        </div>

        <div className="rounded-2xl border border-[#e8dfcf] bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#7a6f60]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Top Promo Code
            </span>
            <Sparkles className="h-4 w-4 text-[#c99b53]" aria-hidden="true" />
          </div>
          <div className="mt-2 truncate font-mono text-xl font-black tracking-tight text-[#0f352d]">
            {metrics.topCouponCode ?? "None yet"}
          </div>
          <span className="mt-1 block text-[11px] text-[#7a6f60]">
            Highest redemption volume
          </span>
        </div>
      </section>

      {/* Action Header & Search Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#e8dfcf] bg-[#fffdfa] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search by Code */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a6f60]"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search coupon code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] pl-8 pr-3 text-xs font-medium text-[#25221e] placeholder:text-[#9c8f7d] focus:border-[#0f352d] focus:outline-hidden"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] p-1">
            {(["ALL", "ACTIVE", "PAUSED", "EXPIRED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition",
                  statusFilter === tab
                    ? "bg-[#0f352d] text-white shadow-2xs"
                    : "text-[#635b50] hover:text-[#0f352d]",
                )}
              >
                {tab === "ALL" ? "All" : tab.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Add Coupon Button */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f352d] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#09241e]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add New Coupon</span>
        </button>
      </div>

      {/* Coupons Table / Card Grid */}
      {filteredCoupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dfd4c2] bg-[#fffdfa] p-12 text-center">
          <Ticket className="mx-auto h-10 w-10 text-[#a0907d]" aria-hidden="true" />
          <h3 className="mt-3 text-base font-bold text-[#0f352d]">
            No coupons found
          </h3>
          <p className="mt-1 text-xs text-[#7a6f60]">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search query or status filter."
              : "Create your first promotional code to incentivize direct orders."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0f352d] px-4 py-2 text-xs font-bold text-white hover:bg-[#09241e]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create Coupon</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e8dfcf] bg-[#fffdfa] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#e8dfcf] bg-[#f8f5ee] text-[11px] font-bold uppercase tracking-wider text-[#635b50]">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Coupon Code
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Discount Rule
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Min. Spend
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Redemptions / Limits
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Validity Window
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e8dc]">
                {filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  const isPercent = coupon.discountType === "PERCENT";
                  const discountDescription = isPercent
                    ? `${coupon.value}% Off${
                        coupon.maxDiscountPaise
                          ? ` (Max ${formatRupees(coupon.maxDiscountPaise)})`
                          : ""
                      }`
                    : `${formatRupees(coupon.value)} Flat Off`;

                  const usageRatio =
                    coupon.usageLimit && coupon.usageLimit > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (coupon.redemptionCount / coupon.usageLimit) * 100,
                          ),
                        )
                      : null;

                  return (
                    <tr
                      key={coupon.id}
                      className="transition-colors hover:bg-[#faf7f2]/70"
                    >
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-black tracking-wide text-[#0f352d]">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy code"
                            className="rounded p-1 text-[#7a6f60] transition hover:bg-[#f0e8dc] hover:text-[#0f352d]"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-700" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.perCustomerLimit && (
                          <span className="block text-[10px] text-[#7a6f60]">
                            Max {coupon.perCustomerLimit} use
                            {coupon.perCustomerLimit > 1 ? "s" : ""} per customer
                          </span>
                        )}
                      </td>

                      {/* Discount Rule */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#c99b53]/40 bg-[#fbf6ed] px-2 py-0.5 font-bold text-[#73511f]">
                          {isPercent ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <Tag className="h-3 w-3" />
                          )}
                          <span>{discountDescription}</span>
                        </span>
                      </td>

                      {/* Min Spend */}
                      <td className="px-4 py-3.5 font-medium text-[#25221e]">
                        {coupon.minOrderPaise > 0 ? (
                          <span>{formatRupees(coupon.minOrderPaise)}</span>
                        ) : (
                          <span className="text-[#7a6f60]">No min spend</span>
                        )}
                      </td>

                      {/* Redemptions / Limits */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[#0f352d]">
                            <span>{coupon.redemptionCount} used</span>
                            {coupon.usageLimit && (
                              <span className="text-[10px] font-normal text-[#7a6f60]">
                                / {coupon.usageLimit} cap
                              </span>
                            )}
                          </div>
                          {usageRatio !== null && (
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#f0e8dc]">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  usageRatio >= 90
                                    ? "bg-rose-500"
                                    : "bg-[#0f352d]",
                                )}
                                style={{ width: `${usageRatio}%` }}
                              />
                            </div>
                          )}
                          {coupon.totalDiscountGivenPaise > 0 && (
                            <span className="block text-[10px] text-[#4a1d5a]">
                              {formatRupees(coupon.totalDiscountGivenPaise)} saved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Validity Window */}
                      <td className="px-4 py-3.5 text-[11px] text-[#635b50]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#a0907d]" />
                          <span>
                            Until{" "}
                            {new Date(coupon.expiresAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Status & Instant Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold",
                              status.color,
                              status.bg,
                              status.border,
                            )}
                          >
                            {status.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(coupon)}
                            className={cn(
                              "text-[10px] font-bold underline transition",
                              coupon.isActive
                                ? "text-amber-800 hover:text-amber-900"
                                : "text-emerald-800 hover:text-emerald-900",
                            )}
                          >
                            {coupon.isActive ? "Pause" : "Activate"}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(coupon)}
                            className="rounded-lg border border-[#dfd4c2] p-1.5 text-[#544d42] transition hover:bg-[#faf7f2] hover:text-[#0f352d]"
                            title="Edit Coupon"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(coupon)}
                            className="rounded-lg border border-[#f0c2c2] p-1.5 text-rose-700 transition hover:bg-rose-50"
                            title="Delete / Archive Coupon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      {modalOpen && (
        <Modal
          onClose={() => setModalOpen(false)}
          title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : "Create New Coupon"}
          subtitle="Configure promotional rules, margin limits, and validity schedules for direct customer checkout."
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Human-Readable Rule Preview Box */}
            <div className="rounded-xl border border-[#c99b53]/40 bg-gradient-to-br from-[#faf6ee] to-[#f5edd9] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#73511f]">
                <ShieldCheck className="h-4 w-4" />
                <span>Live Rule Summary (What Customer Gets)</span>
              </div>
              <p className="mt-1 font-medium text-[#4e402b]">
                Customers get{" "}
                <strong className="text-[#0f352d]">
                  {formData.discountType === "PERCENT"
                    ? `${formData.value}% off`
                    : `₹${formData.value} flat discount`}
                </strong>
                {formData.minOrderRupees > 0
                  ? ` on orders of ₹${formData.minOrderRupees} or more`
                  : " with no minimum order"}
                {formData.discountType === "PERCENT" && formData.maxDiscountRupees
                  ? `, capped at ₹${formData.maxDiscountRupees} maximum savings`
                  : ""}
                .
                {formData.perCustomerLimit
                  ? ` Limited to ${formData.perCustomerLimit} use(s) per account.`
                  : " Unlimited uses per account."}
                {formData.usageLimit
                  ? ` Global cap: first ${formData.usageLimit} redemptions.`
                  : ""}
              </p>
            </div>

            {/* Row 1: Code and Discount Type */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Coupon Code
                </label>
                <p className="mb-1 text-[10px] text-[#7a6f60]">
                  Uppercase identifier (e.g. FESTIVE20)
                </p>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME50"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 font-mono text-sm font-bold tracking-wider text-[#0f352d] uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Discount Type
                </label>
                <p className="mb-1 text-[10px] text-[#7a6f60]">
                  Percentage or Flat Rupee deduction
                </p>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#dfd4c2] bg-[#faf7f2] p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        discountType: "PERCENT",
                        value: 10,
                      }))
                    }
                    className={cn(
                      "rounded-lg py-1.5 text-xs font-bold transition",
                      formData.discountType === "PERCENT"
                        ? "bg-[#0f352d] text-white shadow-2xs"
                        : "text-[#635b50] hover:text-[#0f352d]",
                    )}
                  >
                    % Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        discountType: "FLAT",
                        value: 50,
                        maxDiscountRupees: "",
                      }))
                    }
                    className={cn(
                      "rounded-lg py-1.5 text-xs font-bold transition",
                      formData.discountType === "FLAT"
                        ? "bg-[#0f352d] text-white shadow-2xs"
                        : "text-[#635b50] hover:text-[#0f352d]",
                    )}
                  >
                    ₹ Flat Amount
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Discount Value and Max Cap */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  {formData.discountType === "PERCENT"
                    ? "Discount Percentage (%)"
                    : "Flat Discount Amount (₹)"}
                </label>
                <p className="mb-1 text-[10px] text-[#7a6f60]">
                  {formData.discountType === "PERCENT"
                    ? "Between 1% and 100%"
                    : "Rupees deducted directly at checkout"}
                </p>
                <input
                  type="number"
                  required
                  min={1}
                  max={formData.discountType === "PERCENT" ? 100 : 10000}
                  value={formData.value}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      value: Number(e.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Max Discount Cap (₹)
                </label>
                <p className="mb-1 text-[10px] text-[#7a6f60]">
                  {formData.discountType === "PERCENT"
                    ? "Maximum savings allowed (protects margin)"
                    : "N/A for flat discounts"}
                </p>
                <input
                  type="number"
                  min={1}
                  disabled={formData.discountType === "FLAT"}
                  placeholder={
                    formData.discountType === "PERCENT"
                      ? "e.g. 100 (optional)"
                      : "Fixed by flat discount"
                  }
                  value={formData.maxDiscountRupees}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxDiscountRupees:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Row 3: Minimum Spend & Per-Customer Limit */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Minimum Order Spend (₹)
                </label>
                <p className="mb-1 text-[10px] text-[#7a6f60]">
                  Cart subtotal required (0 for no min)
                </p>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={formData.minOrderRupees}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minOrderRupees: Number(e.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Per-Customer Usage Limit
                </label>
                <p className="mb-1 text-[10px] text-[#7a6f60]">
                  Times 1 customer can use this code (blank = unlimited)
                </p>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 1 (welcome coupon)"
                  value={formData.perCustomerLimit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      perCustomerLimit:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
                />
              </div>
            </div>

            {/* Row 4: Global Usage Limit */}
            <div>
              <label className="block text-xs font-bold text-[#0f352d]">
                Global Redemptions Limit (Optional)
              </label>
              <p className="mb-1 text-[10px] text-[#7a6f60]">
                Total redemptions allowed across all users (e.g. 500 for first 500 customers)
              </p>
              <input
                type="number"
                min={1}
                placeholder="Leave blank for unlimited total redemptions"
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usageLimit:
                      e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-sm font-bold text-[#0f352d]"
              />
            </div>

            {/* Row 5: Validity Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startsAt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startsAt: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-xs font-bold text-[#0f352d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f352d]">
                  Expiration Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expiresAt: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#dfd4c2] bg-[#faf7f2] px-3 text-xs font-bold text-[#0f352d]"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <label className="flex items-center gap-2.5 rounded-xl border border-[#ece3d5] bg-[#faf7f2] p-3 text-xs font-bold text-[#0f352d]">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded accent-[#0f352d]"
              />
              <span>Coupon is active immediately upon saving</span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[#ece3d5] pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-[#dfd4c2] px-4 py-2 text-xs font-bold text-[#544d42] hover:bg-[#faf7f2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#0f352d] px-5 py-2 text-xs font-bold text-white hover:bg-[#09241e] disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingCoupon
                    ? "Update Coupon"
                    : "Create Coupon"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
