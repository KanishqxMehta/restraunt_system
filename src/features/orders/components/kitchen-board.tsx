"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Sliders, AlertTriangle } from "lucide-react";
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
    <div className="grid items-start gap-5 lg:grid-cols-3">
      {kitchenStages.map((stage) => {
        const orders = tickets.filter((ticket) => ticket.status === stage);
        return (
          <section
            key={stage}
            aria-label={laneLabels[stage]}
            className="min-w-0 rounded-2xl bg-stone-100 p-4"
          >
            <header className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{laneLabels[stage]}</h2>
              <span className="rounded-full bg-white px-3 py-1 font-semibold">
                {orders.length}
              </span>
            </header>
            <div className="space-y-3">
              {orders.length === 0 && (
                <p className="rounded-xl border border-dashed border-stone-300 p-5 text-stone-600">
                  No tickets in this stage.
                </p>
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
  const [overrideReason, setOverrideReason] = useState("Station backlog / Dum batch release");
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  const remaining =
    now === null ? null : ticket.promisedReadyAt.getTime() - now;
  const late =
    stage !== "READY" && (remaining === null ? ticket.isLate : remaining < 0);
  const criticalLate =
    stage !== "READY" &&
    (remaining === null ? ticket.isCriticalLate : remaining <= -10 * 60 * 1000);

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
        "/api/kitchen/orders/" + encodeURIComponent(ticket.id) + "/override-promise",
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
        "min-w-0 rounded-xl border p-4 transition shadow-xs",
        criticalLate
          ? "border-2 border-red-600 bg-red-50/40 ring-2 ring-red-400/50"
          : late
            ? "border-red-400 bg-red-50/20"
            : "border-stone-200 bg-white",
      )}
    >
      {/* Critical 10+ Min Lateness Alert Banner */}
      {criticalLate && (
        <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-center text-xs font-bold text-white tracking-wider animate-pulse uppercase">
          <AlertTriangle className="h-4 w-4" />
          10+ Min Late · Manager Alert
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="break-all text-xl font-black text-stone-900 tracking-tight">
            {ticket.orderNumber}
          </h3>
          <p className="mt-0.5 text-xs text-stone-500 font-medium">{ticket.outlet.name}</p>
        </div>

        {/* AI & Override Status Badges */}
        <div className="flex flex-col items-end gap-1">
          {ticket.estimateSource === "GEMINI_AI" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
              <Sparkles className="h-3 w-3 text-emerald-700" /> Gemini AI
            </span>
          )}
          {ticket.estimateSource === "MANAGER_OVERRIDE" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-900">
              <Sliders className="h-3 w-3 text-purple-700" /> Override
            </span>
          )}
        </div>
      </div>

      {ticket.managerOverrideReason && (
        <p className="mt-1 text-xs text-purple-900 bg-purple-50 rounded-md p-1.5 border border-purple-200">
          <strong>Supervisor note:</strong> {ticket.managerOverrideReason}
        </p>
      )}

      {/* Timer & Due Display */}
      <div
        className={cn(
          "mt-3 rounded-lg px-3 py-2 font-bold tabular-nums flex items-center justify-between text-sm",
          criticalLate
            ? "bg-red-700 text-white"
            : late
              ? "bg-red-100 text-red-900"
              : "bg-emerald-50 text-emerald-950",
        )}
      >
        <span>
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
        <p className="mt-2 text-xs text-stone-500">
          Accepted {duration(age)} ago
        </p>
      )}

      {/* Items List */}
      <ul className="my-4 divide-y divide-stone-100">
        {ticket.items.map((item, index) => {
          const addons = snapshotAddons(item.addons);
          return (
            <li key={index} className="py-2.5">
              <p className="text-base font-bold text-stone-900">
                {item.quantity} × {item.name}
              </p>
              <p className="text-xs text-stone-600">
                {item.portionName}
                {addons.length > 0 &&
                  " · " + addons.map((addon) => addon.name).join(", ")}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-2 items-center">
                <DietaryMark isVeg={item.isVeg} />
                {item.allergens.length > 0 && (
                  <p className="text-xs text-amber-800 font-medium">
                    Allergens: {item.allergens.join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mb-3 text-xs text-red-800">
          {error}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {canAdvance && (
          <Button
            className="flex-1 font-bold"
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
            className="flex items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            title="Adjust promised preparation time"
          >
            <Sliders className="h-4 w-4" />
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
          <p className="mb-5 text-stone-700">
            Confirm that the delivery partner has collected {ticket.orderNumber}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={() => void advance()}>Confirm collected</Button>
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
            <p className="text-xs text-stone-600">
              Kitchen supervisors can adjust the promised ready time if unexpected delays occur. The customer&apos;s live tracking screen will update immediately.
            </p>

            {overrideError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {overrideError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Extend ready time from now by:
              </label>
              <div className="flex gap-2 mb-2">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setExtraMinutes(mins)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-bold transition",
                      extraMinutes === mins
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100",
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
              <label className="block text-sm font-semibold text-stone-800 mb-1">
                Reason for delay:
              </label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-none focus:border-stone-800 mb-2"
              >
                <option value="Station backlog / Dum batch release">Station backlog / Dum batch release</option>
                <option value="Hand-crafted dum pot slow to seal">Hand-crafted dum pot slow to seal</option>
                <option value="Ingredient restocking from storage">Ingredient restocking from storage</option>
                <option value="Peak rush container packaging backlog">Peak rush container packaging backlog</option>
                <option value="Delivery partner rider delayed">Delivery partner rider delayed</option>
              </select>
              <InputField
                label="Or custom explanation"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
              <Button type="button" variant="secondary" onClick={() => setOverriding(false)}>
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
