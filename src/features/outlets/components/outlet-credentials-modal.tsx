"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  ChefHat,
  UserCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useAlert } from "@/components/ui/alert-toast";
import { authClient } from "@/features/auth/client";

export interface OutletCredentialsData {
  outletId: string;
  outletName: string;
  slug?: string;
  isCloudKitchen?: boolean;
  fssaiLicense?: string;
  staffName: string;
  email: string;
  password: string;
  pin: string;
  role: string;
  kdsUrl: string;
}

interface OutletCredentialsModalProps {
  outletId: string;
  outletName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OutletCredentialsModal({
  outletId,
  outletName,
  isOpen,
  onClose,
}: OutletCredentialsModalProps) {
  const router = useRouter();
  const alert = useAlert();
  const [data, setData] = useState<OutletCredentialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch(`/api/admin/outlets/${outletId}/credentials`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load credentials");
        return res.json();
      })
      .then((json: OutletCredentialsData) => {
        if (active) setData(json);
      })
      .catch((err) => {
        if (active) {
          alert.failure(
            "Error Loading Credentials",
            err instanceof Error ? err.message : "Network error",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, outletId, alert]);

  function copyText(key: string, text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    alert.success("Copied to Clipboard", `${label} copied: ${text}`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  }

  function copyAll() {
    if (!data) return;
    const summary = [
      `OUTLET: ${data.outletName} (${data.outletId})`,
      `TYPE: ${data.isCloudKitchen ? "Cloud Kitchen" : "Dine-in"}`,
      `STAFF ACCOUNT: ${data.staffName}`,
      `LOGIN EMAIL: ${data.email}`,
      `PASSWORD: ${data.password}`,
      `STATION PIN: ${data.pin}`,
      `KDS DIRECT URL: ${data.kdsUrl}`,
    ].join("\n");

    navigator.clipboard.writeText(summary);
    alert.success(
      "All Credentials Copied",
      `Copied complete credentials package for ${data.outletName}.`,
    );
  }

  async function handleSwitchToStaff() {
    if (!data || isSwitching) return;
    setIsSwitching(true);
    try {
      await authClient.signOut();
      const res = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to sign in as staff");
      }
      alert.success(
        "Signed In as Staff",
        `Now operating as ${data.staffName} on ${data.outletName} KDS.`,
      );
      onClose();
      router.push(data.kdsUrl);
      router.refresh();
    } catch (err) {
      alert.failure(
        "Staff Sign-In Error",
        err instanceof Error ? err.message : "Sign-in failed",
      );
    } finally {
      setIsSwitching(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      title={`Kitchen Access & Creds: ${outletName}`}
      subtitle="Fleet Operations · Dedicated Kitchen Staff Account"
      maxWidth="max-w-lg"
      onClose={onClose}
    >
      <div className="space-y-5 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#7a6f60]">
            <Loader2 className="h-8 w-8 animate-spin text-[#c99b53]" />
            <span className="mt-3 text-xs font-semibold">
              Loading &amp; verifying outlet staff credentials…
            </span>
          </div>
        ) : !data ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
            Failed to retrieve credentials for this outlet.
          </div>
        ) : (
          <>
            {/* Outlet Header Card */}
            <div className="flex items-center justify-between rounded-2xl border border-[#ded2bf] bg-[#faf7f2] p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f352d] text-white shadow-xs">
                  <ChefHat className="h-5 w-5 text-[#c99b53]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-[#0f352d]">
                      {data.outletName}
                    </strong>
                    <span className="rounded-md border border-[#c99b53]/40 bg-[#fbf8f2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#73511f]">
                      {data.isCloudKitchen ? "Cloud Kitchen" : "Dine-in"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#716556]">
                    ID: <code className="font-mono text-[#0f352d]">{data.outletId}</code>
                    {data.fssaiLicense && (
                      <span className="ml-2">· FSSAI: {data.fssaiLicense}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Fields */}
            <div className="space-y-3">
              {/* Staff User Name */}
              <div className="rounded-xl border border-[#e5dbc9] bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
                    Staff Account Identity
                  </span>
                  <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#065f46] border border-[#a7f3d0]">
                    ROLE: KITCHEN_STAFF
                  </span>
                </div>
                <div className="mt-1 text-xs font-bold text-[#1f1c18]">
                  {data.staffName}
                </div>
              </div>

              {/* Login Email */}
              <div className="rounded-xl border border-[#e5dbc9] bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
                    Login Email / Username
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("email", data.email, "Login Email")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f352d] hover:text-[#185346]"
                  >
                    {copiedKey === "email" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-[#0f352d]">
                  {data.email}
                </div>
              </div>

              {/* Login Password */}
              <div className="rounded-xl border border-[#e5dbc9] bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
                    Access Password
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7a6f60] hover:text-[#1f1c18]"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyText("password", data.password, "Password")
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f352d] hover:text-[#185346]"
                    >
                      {copiedKey === "password" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-[#0f352d]">
                  {showPassword ? data.password : "•••••••••••••••"}
                </div>
              </div>

              {/* Quick Station PIN */}
              <div className="rounded-xl border border-[#e5dbc9] bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a6f60]">
                    Station Terminal PIN
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("pin", data.pin, "Station PIN")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f352d] hover:text-[#185346]"
                  >
                    {copiedKey === "pin" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-block rounded-lg bg-[#f0e7d8] px-2.5 py-1 font-mono text-xs font-extrabold tracking-widest text-[#443c33]">
                    {data.pin}
                  </span>
                  <span className="text-[11px] text-[#716556]">
                    4-digit quick identifier for POS &amp; line displays
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Direct KDS Power Tip */}
            <div className="rounded-xl border border-[#c99b53]/40 bg-gradient-to-r from-[#fbf8f2] to-[#f6f0e4] p-3 text-xs leading-relaxed text-[#443c33]">
              <div className="flex items-center gap-1.5 font-bold text-[#73511f]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Central Admin Operational Clearance</span>
              </div>
              <p className="mt-0.5 text-[11px]">
                You do not need to sign out to operate this outlet. Clicking{" "}
                <strong>&ldquo;Open KDS as Admin&rdquo;</strong> launches this outlet&apos;s
                live queue with master permissions to advance stages, mark items 86&apos;d, and adjust SLA times.
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ece3d5] pt-4">
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#d5c7b3] bg-white px-3 py-2 text-xs font-bold text-[#554b3f] transition hover:bg-[#f6f1e7]"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy All Creds</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSwitchToStaff}
                  disabled={isSwitching}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3.5 py-2 text-xs font-bold text-[#4a1d5a] transition hover:bg-[#ede0f4] disabled:opacity-50"
                  title="Switch current browser session directly to this staff user"
                >
                  {isSwitching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Switching…</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Sign In as Staff</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(data.kdsUrl);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f352d] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#185346]"
                >
                  <span>Open KDS as Admin</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
