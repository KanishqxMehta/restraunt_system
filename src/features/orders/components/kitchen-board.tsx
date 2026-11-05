"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
  const remaining =
    now === null ? null : ticket.promisedReadyAt.getTime() - now;
  const late =
    stage !== "READY" && (remaining === null ? ticket.isLate : remaining < 0);
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
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ClientError && [404, 409].includes(error.status)) {
        startTransition(() => router.refresh());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={cn(
        "min-w-0 rounded-xl border bg-white p-4",
        late ? "border-red-400" : "border-stone-200",
      )}
    >
      <h3 className="break-all text-lg font-bold">{ticket.orderNumber}</h3>
      <p className="mt-1 text-sm text-stone-600">{ticket.outlet.name}</p>
      <p
        className={cn(
          "mt-3 rounded-lg px-3 py-2 font-semibold tabular-nums",
          late ? "bg-red-100 text-red-900" : "bg-emerald-50 text-emerald-950",
        )}
      >
        {stage === "READY"
          ? pickupWait === null
            ? "Waiting for pickup"
            : "Pickup wait " + duration(pickupWait)
          : remaining === null
            ? "Due " + formatTime(ticket.promisedReadyAt)
            : late
              ? "Late by " + duration(remaining)
              : "Due in " + duration(remaining)}
      </p>
      {stage !== "READY" && age !== null && (
        <p className="mt-2 text-sm text-stone-600">
          Accepted {duration(age)} ago
        </p>
      )}
      <ul className="my-4 divide-y divide-stone-100">
        {ticket.items.map((item, index) => {
          const addons = snapshotAddons(item.addons);
          return (
            <li key={index} className="py-2">
              <p className="text-lg font-semibold">
                {item.quantity} × {item.name}
              </p>
              <p className="text-sm text-stone-700">
                {item.portionName}
                {addons.length > 0 &&
                  " · " + addons.map((addon) => addon.name).join(", ")}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-2">
                <DietaryMark isVeg={item.isVeg} />
                {item.allergens.length > 0 && (
                  <p className="text-sm font-medium text-stone-700">
                    Allergens: {item.allergens.join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {canAdvance && (
        <Button
          className="w-full"
          disabled={saving || refreshing}
          onClick={() =>
            stage === "READY" ? setConfirming(true) : void advance()
          }
        >
          {saving || refreshing ? "Updating…" : action.label}
        </Button>
      )}
      {confirming && (
        <Modal
          title="Confirm rider handoff"
          onClose={() => setConfirming(false)}
        >
          <p className="mb-5 text-stone-700">
            Confirm that the delivery partner has collected {ticket.orderNumber}
            .
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={() => void advance()}>Confirm collected</Button>
          </div>
        </Modal>
      )}
    </article>
  );
}
