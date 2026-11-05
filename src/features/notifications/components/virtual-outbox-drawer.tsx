"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Phone, X, ExternalLink, CheckCheck, RefreshCw, Send } from "lucide-react";
import { formatTime } from "@/lib/format";
import { requestJson } from "@/lib/http-client";

export interface MockNotificationItem {
  id: string;
  orderId: string;
  channel: "WHATSAPP" | "SMS";
  event: string;
  recipient: string;
  title: string;
  body: string;
  whatsappDeepLink: string | null;
  gatewayMessageId: string;
  sentAt: string;
}

interface VirtualOutboxDrawerProps {
  orderId: string;
  orderNumber: string;
  outletName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VirtualOutboxDrawer({
  orderId,
  orderNumber,
  outletName,
  isOpen,
  onClose,
}: VirtualOutboxDrawerProps) {
  const [activeTab, setActiveTab] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [notifications, setNotifications] = useState<MockNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    requestJson<{ notifications: MockNotificationItem[] }>(
      `/api/orders/${orderId}/notifications`,
    )
      .then((res) => {
        setNotifications(res.notifications);
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    requestJson<{ notifications: MockNotificationItem[] }>(
      `/api/orders/${orderId}/notifications`,
    )
      .then((res) => {
        if (active) {
          setNotifications(res.notifications);
        }
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
      });

    return () => {
      active = false;
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const whatsappMessages = notifications.filter((n) => n.channel === "WHATSAPP");
  const smsMessages = notifications.filter((n) => n.channel === "SMS");
  const activeList = activeTab === "WHATSAPP" ? whatsappMessages : smsMessages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a0f20]/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col h-[85vh] w-full max-w-lg rounded-3xl border border-[#ded5c6] bg-[#fffdfa] shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#ede6da] bg-[#faf8f5] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#133d34] text-white">
                <Send className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base font-bold text-[#133d34]">
                Virtual Device Outbox · Order #{orderNumber}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-[#635b50]">
              Simulated customer notification delivery log ({notifications.length} dispatched)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchNotifications}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4efe5] text-[#25221e] hover:bg-[#ede3f5] transition"
              title="Refresh messages"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4efe5] text-[#25221e] hover:bg-[#ede3f5] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Channel Switcher */}
        <div className="flex border-b border-[#ede6da] bg-[#faf8f5] px-6 py-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("WHATSAPP")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "WHATSAPP"
                ? "bg-[#25d366] text-white shadow-xs"
                : "bg-[#fffdfa] text-[#544d42] border border-[#ded5c6] hover:bg-[#f4efe5]"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp Simulator ({whatsappMessages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SMS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "SMS"
                ? "bg-[#133d34] text-white shadow-xs"
                : "bg-[#fffdfa] text-[#544d42] border border-[#ded5c6] hover:bg-[#f4efe5]"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            SMS Carrier Log ({smsMessages.length})
          </button>
        </div>

        {/* Message Container Screen */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8f5ee]">
          {activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4efe5] text-[#635b50] mb-3">
                <Send className="h-5 w-5" />
              </span>
              <p className="text-sm font-bold text-[#133d34]">No messages yet</p>
              <p className="text-xs text-[#635b50] mt-1 max-w-xs">
                As the order moves through cooking and packaging in the kitchen, mock SMS and WhatsApp alerts will appear here.
              </p>
            </div>
          ) : activeTab === "WHATSAPP" ? (
            /* WhatsApp Chat UI */
            <div className="space-y-4">
              <div className="mx-auto flex justify-center">
                <span className="rounded-lg bg-[#efe9dc] px-3 py-1 text-[11px] font-semibold text-[#635b50]">
                  Messages are end-to-end encrypted · Mock gateway
                </span>
              </div>

              {whatsappMessages.map((msg) => (
                <article
                  key={msg.id}
                  className="ml-auto max-w-[90%] rounded-2xl rounded-tr-xs bg-[#d9fdd3] p-4 text-[#111b21] shadow-xs border border-[#c3edbc]"
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#54656f] mb-1.5 pb-1 border-b border-[#b7e4b0]">
                    <span className="font-bold text-[#075e54]">Company A · {outletName}</span>
                    <span>To: {msg.recipient}</span>
                  </div>

                  {/* Body with formatted bold text */}
                  <div className="whitespace-pre-wrap text-xs leading-relaxed font-sans">
                    {msg.body.split("\n").map((line, i) => {
                      // Format *bold*
                      const parts = line.split(/(\*[^*]+\*)/g);
                      return (
                        <p key={i} className="min-h-4">
                          {parts.map((part, pi) =>
                            part.startsWith("*") && part.endsWith("*") ? (
                              <strong key={pi}>{part.slice(1, -1)}</strong>
                            ) : (
                              part
                            ),
                          )}
                        </p>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-[#b7e4b0] pt-2 text-[10px] text-[#54656f]">
                    <span className="font-mono text-[9px] text-[#6b7c85]">
                      {msg.gatewayMessageId}
                    </span>
                    <div className="flex items-center gap-1">
                      <span>{formatTime(new Date(msg.sentAt))}</span>
                      <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                    </div>
                  </div>

                  {msg.whatsappDeepLink && (
                    <div className="mt-2 pt-2 border-t border-[#b7e4b0]/70 flex justify-end">
                      <a
                        href={msg.whatsappDeepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#00a884] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-[#008f6f]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Preview in Real WhatsApp
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            /* SMS Carrier UI */
            <div className="space-y-4">
              <div className="mx-auto flex justify-center">
                <span className="rounded-lg bg-[#ede5d8] px-3 py-1 text-[11px] font-bold text-[#635b50]">
                  Transacted via DLT Header: CP-COMPNY
                </span>
              </div>

              {smsMessages.map((msg) => (
                <article
                  key={msg.id}
                  className="rounded-2xl rounded-tl-xs bg-[#fffdfa] p-4 text-[#25221e] shadow-xs border border-[#ded5c6]"
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#635b50] mb-2 pb-1 border-b border-[#ede6da]">
                    <span className="font-bold text-[#133d34]">SMS: {msg.title}</span>
                    <span>To: {msg.recipient}</span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#25221e]">
                    {msg.body}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-[#ede6da] pt-2 text-[10px] text-[#635b50]">
                    <span className="font-mono text-[9px]">
                      SID: {msg.gatewayMessageId} ({msg.body.length} chars)
                    </span>
                    <span>{formatTime(new Date(msg.sentAt))}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="flex items-center justify-between border-t border-[#ede6da] bg-[#faf8f5] px-6 py-3 text-xs text-[#635b50]">
          <span>Mock delivery simulator · No real cellular or WhatsApp charges</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#ded5c6] bg-[#fffdfa] px-4 py-2 font-bold text-[#133d34] hover:bg-[#f4efe5] transition"
          >
            Close Outbox
          </button>
        </div>
      </div>
    </div>
  );
}
