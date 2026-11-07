"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Users } from "lucide-react";
import { authClient } from "../client";
import { demoAccounts, DEMO_PASSWORD } from "../demo-accounts";
import { homeForRole, roleLabels } from "../roles";
import { SelectMenu } from "@/components/ui/select-menu";

export function DemoRoleSwitcher({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const visibleAccounts = demoAccounts.filter(
    (a) => a.id !== "demo-customer-two",
  );

  async function handleSwitchRole(nextEmail: string) {
    if (switchingTo || nextEmail === currentEmail) return;
    const target = visibleAccounts.find((a) => a.email === nextEmail);
    if (!target) return;

    setSwitchingTo(target.name);
    try {
      await authClient.signOut();
      const res = await authClient.signIn.email({
        email: target.email,
        password: DEMO_PASSWORD,
      });
      if (!res.error) {
        router.push(homeForRole(target.role));
        router.refresh();
      }
    } finally {
      setSwitchingTo(null);
    }
  }

  const isKnownDemo = visibleAccounts.some((a) => a.email === currentEmail);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {switchingTo ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1 text-xs font-bold text-[#4a1d5a]">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          <span>Switching to {switchingTo}…</span>
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#4a1d5a] sm:inline-flex">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Quick Switch Role:</span>
          </span>
          <SelectMenu
            value={isKnownDemo ? currentEmail : ""}
            placeholder="Switch demo role…"
            ariaLabel="Quick switch demo role"
            size="sm"
            align="right"
            searchable={false}
            onChange={(val) => void handleSwitchRole(val)}
            options={visibleAccounts.map((acc) => ({
              value: acc.email,
              label: acc.name,
              badge: roleLabels[acc.role],
              description: acc.summary,
            }))}
          />
        </div>
      )}
    </div>
  );
}
