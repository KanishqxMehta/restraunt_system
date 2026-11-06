"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/classes";

export function RefreshStatus({ orderId }: { orderId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [connection, setConnection] = useState<
    "Connecting" | "Live" | "Reconnecting"
  >("Connecting");

  useEffect(() => {
    const url = orderId
      ? "/api/orders/live?orderId=" + encodeURIComponent(orderId)
      : "/api/orders/live";
    const stream = new EventSource(url);
    const refresh = () => startTransition(() => router.refresh());
    stream.addEventListener("ready", () => {
      setConnection("Live");
      refresh();
    });
    stream.addEventListener("change", refresh);
    stream.onerror = () => setConnection("Reconnecting");
    const reconcile = setInterval(refresh, 15_000);

    return () => {
      stream.close();
      clearInterval(reconcile);
    };
  }, [orderId, router, startTransition]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-2xs",
          connection === "Live"
            ? "border-emerald-300 bg-emerald-50/90 text-emerald-950"
            : "border-amber-300 bg-amber-50/90 text-amber-950",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-2 w-2 rounded-full",
            connection === "Live"
              ? "animate-pulse bg-emerald-600"
              : "bg-amber-500",
          )}
        />
        {connection}
      </span>
      <Button
        variant="secondary"
        disabled={pending}
        className="min-h-10 px-3.5 py-2 text-xs"
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw
          className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          aria-hidden="true"
        />
        {pending ? "Refreshing…" : "Refresh status"}
      </Button>
    </div>
  );
}
