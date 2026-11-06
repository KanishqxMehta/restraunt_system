"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  Sparkles,
  ReceiptText,
  BarChart3,
  BookOpen,
  ChefHat,
  Store,
} from "lucide-react";
import type { Role } from "@/features/auth/roles";
import { cn } from "@/lib/classes";

export function WorkspaceNav({ role }: { role: Role }) {
  const pathname = usePathname();

  if (role === "CUSTOMER") {
    const items = [
      {
        href: "/order",
        label: "Order food",
        icon: UtensilsCrossed,
        active: pathname === "/order" || pathname === "/checkout",
      },
      {
        href: "/party-orders",
        label: "Party catering",
        icon: Sparkles,
        active: pathname.startsWith("/party-orders"),
      },
      {
        href: "/account",
        label: "My orders",
        icon: ReceiptText,
        active:
          pathname.startsWith("/account") || pathname.startsWith("/orders/"),
      },
    ];

    return (
      <nav
        aria-label="Customer navigation"
        className="flex flex-wrap items-center gap-1 rounded-2xl border border-[#e3d8c6] bg-[#f5efe4]/80 p-1 shadow-[inset_0_1px_2px_rgba(37,34,30,0.05)]"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold tracking-tight transition-all sm:text-sm",
                item.active
                  ? "bg-[#0f352d] text-white shadow-xs"
                  : "text-[#4e473d] hover:bg-[#fffdfa] hover:text-[#0f352d]",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  item.active ? "text-[#f4d6a9]" : "text-[#7a6f60]",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  if (role === "CENTRAL_ADMIN") {
    const items = [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: BarChart3,
        active: pathname.startsWith("/admin/dashboard"),
      },
      {
        href: "/admin/menu",
        label: "Menu & Stock",
        icon: BookOpen,
        active: pathname.startsWith("/admin/menu"),
      },
      {
        href: "/admin/outlets",
        label: "Outlets",
        icon: Store,
        active: pathname.startsWith("/admin/outlets"),
      },
      {
        href: "/kitchen",
        label: "Kitchen KDS",
        icon: ChefHat,
        active: pathname.startsWith("/kitchen"),
      },
    ];

    return (
      <nav
        aria-label="Admin navigation"
        className="flex flex-wrap items-center gap-1 rounded-2xl border border-[#e3d8c6] bg-[#f5efe4]/80 p-1 shadow-[inset_0_1px_2px_rgba(37,34,30,0.05)]"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold tracking-tight transition-all sm:text-sm",
                item.active
                  ? "bg-[#0f352d] text-white shadow-xs"
                  : "text-[#4e473d] hover:bg-[#fffdfa] hover:text-[#0f352d]",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  item.active ? "text-[#f4d6a9]" : "text-[#7a6f60]",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-3.5 py-1.5 text-xs font-bold text-[#0f352d]">
      <ChefHat className="h-3.5 w-3.5 text-[#0f352d]" aria-hidden="true" />
      <span>Kitchen KDS Station</span>
    </div>
  );
}
