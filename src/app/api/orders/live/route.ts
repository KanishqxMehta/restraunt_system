import { AsyncLocalStorage } from "node:async_hooks";
import { requireViewer } from "@/features/auth/session";
import type { Viewer } from "@/features/auth/policy";
import { findOrder } from "@/features/orders/repository";
import { apiError, HttpError } from "@/server/http/errors";
import { getOrderListener, type OrderChange } from "@/server/db/order-listener";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (orderId !== null && (!orderId || orderId.length > 128)) {
      throw new HttpError(400, "Invalid order.");
    }
    const roles =
      orderId === null
        ? (["KITCHEN_STAFF", "CENTRAL_ADMIN"] as const)
        : (["CUSTOMER"] as const);
    let viewer = await requireViewer(roles, request.headers);
    if (orderId !== null) await findOrder(viewer, orderId);

    function matches(current: Viewer, event: OrderChange) {
      if (orderId !== null) return event.orderId === orderId;
      return (
        current.role === "CENTRAL_ADMIN" ||
        current.outletIds.includes(event.outletId)
      );
    }

    const encoder = new TextEncoder();
    let dispose: (() => void) | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        let connected = false;
        let checking = false;
        let pending: OrderChange | undefined;

        function send(message: string) {
          // The client periodically reconciles even if backpressure drops a hint.
          if (!closed && (controller.desiredSize ?? 0) > 0) {
            controller.enqueue(encoder.encode(message));
          }
        }

        function cleanup() {
          if (closed) return;
          closed = true;
          subscription.unsubscribe();
          clearInterval(heartbeat);
          clearTimeout(lifetime);
          request.signal.removeEventListener("abort", close);
        }

        function close() {
          if (closed) return;
          cleanup();
          controller.close();
        }

        async function checkChanges() {
          if (checking) return;
          checking = true;
          try {
            while (!closed && pending) {
              const event = pending;
              pending = undefined;
              viewer = await requireViewer(roles, request.headers);
              if (!matches(viewer, event)) continue;
              if (orderId !== null) await findOrder(viewer, orderId);
              send("event: change\ndata: {}\n\n");
            }
          } catch {
            close();
          } finally {
            checking = false;
          }
        }

        const subscription = getOrderListener().subscribe({
          change: AsyncLocalStorage.bind((event: OrderChange) => {
            if (!connected || !matches(viewer, event)) return;
            pending = event;
            void checkChanges();
          }),
          disconnect: () => queueMicrotask(close),
        });
        const heartbeat = setInterval(() => send(": heartbeat\n\n"), 15_000);
        const lifetime = setTimeout(close, 45_000);
        dispose = cleanup;
        request.signal.addEventListener("abort", close, { once: true });
        if (request.signal.aborted) close();
        void subscription.ready.then(() => {
          connected = true;
          send("retry: 1500\nevent: ready\ndata: {}\n\n");
        }, close);
      },
      cancel() {
        dispose?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
