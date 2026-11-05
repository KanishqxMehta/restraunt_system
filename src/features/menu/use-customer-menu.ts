"use client";
import { useEffect, useState } from "react";
import { requestJson, errorMessage } from "@/lib/http-client";
import type { CustomerMenu } from "./types";
export function useCustomerMenu(outletId: string | null) {
  const [result, setResult] = useState<{
    outletId: string;
    menu?: CustomerMenu;
    error?: string;
  } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!outletId) return;
    const controller = new AbortController();
    requestJson<CustomerMenu>(
      `/api/outlets/${encodeURIComponent(outletId)}/menu`,
      { signal: controller.signal },
    )
      .then((menu) => setResult({ outletId, menu }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ outletId, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [outletId, version]);
  const current = result?.outletId === outletId ? result : null;
  return {
    menu: current?.menu,
    error: current?.error,
    loading: Boolean(outletId && !current),
    retry: () => setVersion((version) => version + 1),
  };
}
