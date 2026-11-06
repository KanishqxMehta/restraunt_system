"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Sliders,
  AlertTriangle,
  Flame,
  BellRing,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { InputField } from "@/components/ui/input-field";
import { DietaryMark } from "@/features/menu/components/dietary-mark";
import { ClientError, errorMessage, requestJson } from "@/lib/http-client";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/classes";
import type { listKitchenOrders } from "../repository";
import { snapshotAddons } from "../snapshots";
import { kitchenStages, stageActions, type KitchenStage } from "../stages";

type Ticket = Awaited<ReturnType<typeof listKitchenOrders>>[number];

const laneLabels: Record<KitchenStage, string> = {
  NEW: "New orders",
  PREPARING: "Preparing",
  READY: "Ready for pickup",
};

const laneStyles: Record<
  KitchenStage,
  {
    accent: string;
    badgeBg: string;
    icon: typeof BellRing;
  }
> = {
  NEW: {
    accent: "from-[#c99b53] to-[#9e712a]",
    badgeBg: "border-amber-300 bg-amber-50 text-amber-950",
    icon: BellRing,
  },
  PREPARING: {
    accent: "from-[#3b1747] to-[#5e2570]",
    badgeBg: "border-[#dec9ec] bg-[#f7f2fa] text-[#3b1747]",
    icon: Flame,
  },
  READY: {
    accent: "from-[#0f352d] to-[#1a574a]",
    badgeBg: "border-emerald-300 bg-emerald-50 text-emerald-950",
    icon: CheckCircle2,
  },
};

function duration(ms: number) {
  const seconds = Math.floor(Math.abs(ms) / 1000);
  return (
    Math.floor(seconds / 60) +
    "m " +
    String(seconds % 60).padStart(2, "0") +
    "s"
  );
}

export function KitchenBoard({
  tickets,
  canAdvance,
}: {
  tickets: Ticket[];
  canAdvance: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      {kitchenStages.map((stage) => {
        const orders = tickets.filter((ticket) => ticket.status === stage);
        const style = laneStyles[stage];
        const Icon = style.icon;
        return (
          <section
            key={stage}
            aria-label={laneLabels[stage]}
            className="min-w-0 overflow-hidden rounded-[1.75rem] border border-[#dfd4c2] bg-[#f4ede2]/90 shadow-xs"
          >
            <div className={cn("h-1.5 w-full bg-gradient-to-r", style.accent)} />
            <header className="flex items-center justify-between gap-2 border-b border-[#e4dac9] bg-[#fffdfa] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Icon
                  className="h-4 w-4 text-[#0f352d]"
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-bold tracking-tight text-[#0f352d]">
                  {laneLabels[stage]}
                </h2>
              </div>
              <span
                className={cn(
                  "font-mono-tabular rounded-full border px-3 py-0.5 text-xs font-extrabold",
                  style.badgeBg,
                )}
              >
                {orders.length}
              </span>
            </header>

            <div className="space-y-4 p-4">
              {orders.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#d6c9b6] bg-[#faf7f2] px-5 py-10 text-center text-xs font-medium text-[#655c50]">
                  No tickets in this stage.
                </div>
              )}
              {orders.map((ticket) => (
                <KitchenTicket
                  key={ticket.id}
                  ticket={ticket}
                  stage={stage}
                  now={now}
                  canAdvance={canAdvance}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KitchenTicket({
  ticket,
  stage,
  now,
  canAdvance,
}: {
  ticket: Ticket;
  stage: KitchenStage;
  now: number | null;
  canAdvance: boolean;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [overriding, setOverriding] = useState(false);

  // Override Form State
  const [extraMinutes, setExtraMinutes] = useState(10);
  const [overrideReason, setOverrideReason] = useState(
    "Station backlog / Dum batch release",
  );
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  const remaining =
    now === null ? null : ticket.promisedReadyAt.getTime() - now;
  const late =
    stage !== "READY" && (remaining === null ? ticket.isLate : remaining < 0);
  const criticalLate =
    stage !== "READY" &&
    (remaining === null
      ? ticket.isCriticalLate
      : remaining <= -10 * 60 * 1000);

  const age =
    now === null ? null : Math.max(0, now - ticket.queuedAt.getTime());
  const pickupWait =
    now === null || ticket.readyAt === null
      ? null
      : Math.max(0, now - ticket.readyAt.getTime());
  const action = stageActions[stage];

  async function advance() {
    if (saving || refreshing) return;
    setConfirming(false);
    setSaving(true);
    setError("");
    try {
      await requestJson(
        "/api/kitchen/orders/" + encodeURIComponent(ticket.id) + "/stage",
        {
          method: "POST",
          body: JSON.stringify({ expectedStage: stage }),
        },
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ClientError && [404, 409].includes(err.status)) {
        startTransition(() => router.refresh());
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError("Please provide an override reason.");
      return;
    }
    setOverrideSaving(true);
    setOverrideError("");

    try {
      await requestJson(
        "/api/kitchen/orders/" +
          encodeURIComponent(ticket.id) +
          "/override-promise",
        {
          method: "POST",
          body: JSON.stringify({
            extraMinutes: Number(extraMinutes),
            reason: overrideReason.trim(),
          }),
        },
      );
      setOverriding(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setOverrideError(errorMessage(err));
    } finally {
      setOverrideSaving(false);
    }
  }

  return (
    <article
      className={cn(
        "min-w-0 rounded-2xl border p-4 transition-all shadow-xs",
        criticalLate
          ? "border-2 border-red-600 bg-red-50/70 ring-2 ring-red-400/50"
          : late
            ? "border-red-400 bg-red-50/35"
            : "border-[#dfd4c2] bg-[#fffdfa] hover:border-[#0f352d]/45 hover:shadow-md",
      )}
    >
      {/* Critical 10+ Min Lateness Alert Banner */}
      {criticalLate && (
        <div className="mb-3 flex animate-pulse items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-center text-xs font-bold tracking-wider uppercase text-white">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          10+ Min Late · Manager Alert
        </div>
      )}

      {/* Catering Banner */}
      {ticket.isCatering && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1.5 text-xs font-bold text-[#3b1747] shadow-2xs">
          <span>🎉 Bulk Catering · {ticket.guestCount ?? 20} Guests</span>
          {ticket.eventDate && (
            <span className="font-mono font-semibold text-[#6b21a8]">
              Slot: {formatTime(new Date(ticket.eventDate))}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-mono text-xl font-black tracking-tight break-all text-[#0f352d]">
            {ticket.orderNumber}
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-[#635b50]">
            {ticket.outlet.name}
          </p>
        </div>

        {/* AI & Override Status Badges */}
        <div className="flex flex-col items-end gap-1">
          {ticket.estimateSource === "GEMINI_AI" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-bold text-[#065f46]">
              <Sparkles className="h-3 w-3 text-[#059669]" aria-hidden="true" />{" "}
              Gemini AI
            </span>
          )}
          {ticket.estimateSource === "MANAGER_OVERRIDE" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[11px] font-bold text-[#4a1d5a]">
              <Sliders className="h-3 w-3 text-[#6b21a8]" aria-hidden="true" />{" "}
              Override
            </span>
          )}
        </div>
      </div>

      {ticket.managerOverrideReason && (
        <p className="mt-2.5 rounded-xl border border-[#dec9ec] bg-[#faf6fd] p-2.5 text-xs text-[#3b1747]">
          <strong className="text-[#4a1d5a]">Supervisor note:</strong>{" "}
          {ticket.managerOverrideReason}
        </p>
      )}

      {ticket.specialInstructions && (
        <p className="mt-2.5 rounded-xl border border-[#dec9ec] bg-[#faf6fd] p-2.5 text-xs text-[#522960]">
          <strong className="text-[#3b1747]">Event note:</strong>{" "}
          {ticket.specialInstructions}
        </p>
      )}

      {/* Timer & Due Display */}
      <div
        className={cn(
          "font-mono-tabular mt-3.5 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold",
          criticalLate
            ? "bg-red-700 text-white"
            : late
              ? "border border-red-300 bg-red-100 text-red-900"
              : "border border-[#a7f3d0]/70 bg-[#eef6f4] text-[#0f352d]",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {stage === "READY"
            ? pickupWait === null
              ? "Waiting for pickup"
              : "Pickup wait " + duration(pickupWait)
            : remaining === null
              ? "Due " + formatTime(ticket.promisedReadyAt)
              : late
                ? "Late by " + duration(remaining)
                : "Due in " + duration(remaining)}
        </span>
        <span className="text-xs font-normal opacity-85">
          Promised {formatTime(ticket.promisedReadyAt)}
        </span>
      </div>

      {stage !== "READY" && age !== null && (
        <p className="mt-2 text-xs text-[#655c50]">
          Accepted {duration(age)} ago
        </p>
      )}

      {/* Items List */}
      <ul className="my-4 divide-y divide-[#ece3d5] rounded-xl border border-[#ece3d5] bg-[#faf7f2] px-3.5 py-1">
        {ticket.items.map((item, index) => {
          const addons = snapshotAddons(item.addons);
          return (
            <li key={index} className="py-2.5">
              <p className="text-sm font-extrabold text-[#1f1c18]">
                {item.quantity} × {item.name}
              </p>
              <p className="text-xs font-medium text-[#575046]">
                {item.portionName}
                {addons.length > 0 &&
                  " · " + addons.map((addon) => addon.name).join(", ")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <DietaryMark isVeg={item.isVeg} />
                {item.allergens.length > 0 && (
                  <p className="text-[11px] font-semibold text-amber-900">
                    Allergens: {item.allergens.join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mb-3 text-xs font-medium text-red-800">
          {error}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {canAdvance && (
          <Button
            variant="primary"
            className="min-h-11 flex-1 font-bold"
            disabled={saving || refreshing}
            onClick={() =>
              stage === "READY" ? setConfirming(true) : void advance()
            }
          >
            {saving || refreshing ? "Updating…" : action.label}
          </Button>
        )}

        {stage !== "READY" && canAdvance && (
          <button
            type="button"
            onClick={() => setOverriding(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#d8bfe8] bg-[#f7f2fa] px-3.5 py-2 text-xs font-bold text-[#3b1747] shadow-2xs transition hover:bg-[#ede0f5]"
            title="Adjust promised preparation time"
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            Adjust
          </button>
        )}
      </div>

      {/* Rider Handoff Modal */}
      {confirming && (
        <Modal
          title="Confirm rider handoff"
          onClose={() => setConfirming(false)}
        >
          <p className="mb-6 text-sm leading-6 text-[#4e473d]">
            Confirm that the delivery partner has collected{" "}
            <strong className="font-mono text-[#0f352d]">
              {ticket.orderNumber}
            </strong>
            .
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void advance()}>
              Confirm collected
            </Button>
          </div>
        </Modal>
      )}

      {/* Manager Override Modal */}
      {overriding && (
        <Modal
          title={`Adjust promise: ${ticket.orderNumber}`}
          onClose={() => setOverriding(false)}
        >
          <form onSubmit={handleOverride} className="space-y-4">
            <p className="text-xs leading-5 text-[#544d42]">
              Kitchen supervisors can adjust the promised ready time if
              unexpected delays occur. The customer&apos;s live tracking screen
              will update immediately.
            </p>

            {overrideError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                {overrideError}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0f352d]">
                Extend ready time from now by:
              </label>
              <div className="mb-3 flex gap-2">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setExtraMinutes(mins)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-bold transition",
                      extraMinutes === mins
                        ? "border-[#3b1747] bg-[#3b1747] text-white shadow-xs"
                        : "border-[#dfd4c2] bg-[#faf7f2] text-[#544d42] hover:bg-[#f7f2fa] hover:text-[#4a1d5a]",
                    )}
                  >
                    +{mins} min
                  </button>
                ))}
              </div>
              <InputField
                label="Custom minutes from now"
                type="number"
                min={1}
                max={180}
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#433d35]">
                Reason for delay:
              </label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mb-3 min-h-12 w-full rounded-xl border border-[#dcd2c2] bg-[#fffdfa] px-3 text-sm font-medium outline-none focus:border-[#0f352d]"
              >
                <option value="Station backlog / Dum batch release">
                  Station backlog / Dum batch release
                </option>
                <option value="Hand-crafted dum pot slow to seal">
                  Hand-crafted dum pot slow to seal
                </option>
                <option value="Ingredient restocking from storage">
                  Ingredient restocking from storage
                </option>
                <option value="Peak rush container packaging backlog">
                  Peak rush container packaging backlog
                </option>
                <option value="Delivery partner rider delayed">
                  Delivery partner rider delayed
                </option>
              </select>
              <InputField
                label="Or custom explanation"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-[#ece3d5] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOverriding(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={overrideSaving}>
                {overrideSaving ? "Saving…" : "Update promised time"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </article>
  );
}
