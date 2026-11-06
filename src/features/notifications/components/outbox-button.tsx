"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  VirtualOutboxDrawer,
  type MockNotificationItem,
} from "./virtual-outbox-drawer";
import { requestJson } from "@/lib/http-client";

interface OutboxButtonProps {
  orderId: string;
  orderNumber: string;
  outletName: string;
}

export function OutboxButton({
  orderId,
  orderNumber,
  outletName,
}: OutboxButtonProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      requestJson<{ notifications: MockNotificationItem[] }>(
        `/api/orders/${orderId}/notifications`,
      )
        .then((res) => {
          if (active) setCount(res.notifications.length);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d8bfe8] bg-gradient-to-b from-[#faf5fd] to-[#f2e8f9] px-3.5 py-2 text-xs font-bold text-[#3b1747] shadow-2xs transition hover:border-[#c39fdb] hover:from-[#f5ecfb] hover:to-[#ead9f5] active:scale-95"
        title="View simulated SMS & WhatsApp order updates"
      >
        <MessageSquare className="h-3.5 w-3.5 text-[#6b21a8]" aria-hidden="true" />
        <span>Mock Outbox</span>
        {count > 0 && (
          <span className="rounded-full bg-[#3b1747] px-2 py-0.5 text-[10px] font-extrabold text-[#f4d6a9]">
            {count}
          </span>
        )}
      </button>

      <VirtualOutboxDrawer
        orderId={orderId}
        orderNumber={orderNumber}
        outletName={outletName}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
