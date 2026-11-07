"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertOctagon, Info, X } from "lucide-react";
import { cn } from "@/lib/classes";

export type AlertVariant = "success" | "failure" | "general";

export interface AlertItem {
  id: string;
  variant: AlertVariant;
  title: string;
  message?: string;
}

interface AlertContextValue {
  alerts: AlertItem[];
  showAlert: (
    variant: AlertVariant,
    title: string,
    message?: string,
    durationMs?: number,
  ) => void;
  success: (title: string, message?: string) => void;
  failure: (title: string, message?: string) => void;
  general: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const noopContext: AlertContextValue = {
  alerts: [],
  showAlert: () => {},
  success: () => {},
  failure: () => {},
  general: () => {},
  dismiss: () => {},
};

const AlertContext = createContext<AlertContextValue>(noopContext);

export function useAlert() {
  return useContext(AlertContext);
}

const VARIANT_STYLES: Record<
  AlertVariant,
  {
    badge: string;
    container: string;
    accentBar: string;
    iconWrap: string;
    badgePill: string;
    titleColor: string;
    messageColor: string;
    Icon: typeof CheckCircle2;
  }
> = {
  success: {
    badge: "Success",
    container:
      "border-emerald-300/90 bg-gradient-to-br from-[#ecfdf5] via-[#f7fefa] to-[#fffdfa]",
    accentBar: "bg-gradient-to-r from-[#0f352d] via-emerald-600 to-emerald-400",
    iconWrap: "border-emerald-200 bg-emerald-100 text-[#065f46]",
    badgePill: "border-emerald-200 bg-emerald-100/90 text-[#065f46]",
    titleColor: "text-[#064e3b]",
    messageColor: "text-[#065f46]",
    Icon: CheckCircle2,
  },
  failure: {
    badge: "Alert · Failure",
    container:
      "border-red-300/95 bg-gradient-to-br from-[#fef2f2] via-[#fff8f8] to-[#fffdfa]",
    accentBar: "bg-gradient-to-r from-red-700 via-red-600 to-amber-500",
    iconWrap: "border-red-200 bg-red-100 text-red-800",
    badgePill: "border-red-200 bg-red-100 text-red-800",
    titleColor: "text-red-950",
    messageColor: "text-red-800",
    Icon: AlertOctagon,
  },
  general: {
    badge: "General Notice",
    container:
      "border-[#d9c2eb] bg-gradient-to-br from-[#faf5fd] via-[#fdfbf7] to-[#fffdfa]",
    accentBar: "bg-gradient-to-r from-[#3b1747] via-[#c99b53] to-[#0f352d]",
    iconWrap: "border-[#e2cef0] bg-[#f4ebfa] text-[#3b1747]",
    badgePill: "border-[#dec9ec] bg-[#f4ebfa] text-[#4a1d5a]",
    titleColor: "text-[#2c1136]",
    messageColor: "text-[#4e473d]",
    Icon: Info,
  },
};

export function AlertBanner({
  variant = "general",
  title,
  message,
  onDismiss,
  className,
}: {
  variant?: AlertVariant;
  title: string;
  message?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const style = VARIANT_STYLES[variant];
  const Icon = style.Icon;

  return (
    <div
      role={variant === "failure" ? "alert" : "status"}
      aria-live={variant === "failure" ? "assertive" : "polite"}
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm transition-all",
        style.container,
        className,
      )}
    >
      <div className={cn("h-1 w-full", style.accentBar)} />
      <div className="flex items-start justify-between gap-3 p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
              style.iconWrap,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                  style.badgePill,
                )}
              >
                {style.badge}
              </span>
              <p className={cn("text-xs font-extrabold sm:text-sm", style.titleColor)}>
                {title}
              </p>
            </div>
            {message && (
              <p className={cn("mt-1 text-xs leading-relaxed font-medium", style.messageColor)}>
                {message}
              </p>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={onDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-[#433d35] transition hover:bg-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showAlert = useCallback(
    (
      variant: AlertVariant,
      title: string,
      message?: string,
      durationMs?: number,
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setAlerts((prev) => [...prev.slice(-3), { id, variant, title, message }]);

      const timeout =
        durationMs ?? (variant === "failure" ? 6000 : 4200);
      setTimeout(() => {
        setAlerts((prev) => prev.filter((item) => item.id !== id));
      }, timeout);
    },
    [],
  );

  const success = useCallback(
    (title: string, message?: string) => showAlert("success", title, message),
    [showAlert],
  );

  const failure = useCallback(
    (title: string, message?: string) => showAlert("failure", title, message),
    [showAlert],
  );

  const general = useCallback(
    (title: string, message?: string) => showAlert("general", title, message),
    [showAlert],
  );

  const value = useMemo(
    () => ({
      alerts,
      showAlert,
      success,
      failure,
      general,
      dismiss,
    }),
    [alerts, showAlert, success, failure, general, dismiss],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}

      {/* Global Floating Alert Stack */}
      {alerts.length > 0 && (
        <div
          aria-label="System notifications"
          className="pointer-events-none fixed top-4 right-4 z-[10000] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 sm:top-5 sm:right-5"
        >
          {alerts.map((item) => (
            <div key={item.id} className="pointer-events-auto shadow-xl rounded-2xl">
              <AlertBanner
                variant={item.variant}
                title={item.title}
                message={item.message}
                onDismiss={() => dismiss(item.id)}
              />
            </div>
          ))}
        </div>
      )}
    </AlertContext.Provider>
  );
}
