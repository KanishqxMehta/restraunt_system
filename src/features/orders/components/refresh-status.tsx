"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap items-center gap-3">
      <span
        role="status"
        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-stone-700"
      >
        <span
          aria-hidden="true"
          className={
            connection === "Live"
              ? "h-2 w-2 rounded-full bg-emerald-600"
              : "h-2 w-2 rounded-full bg-amber-500"
          }
        />
        {connection}
      </span>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw
          className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          aria-hidden="true"
        />
        {pending ? "Refreshing…" : "Refresh status"}
      </Button>
    </div>
  );
}
