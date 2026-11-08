"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  Sparkles,
  ReceiptText,
  BarChart3,
  BookOpen,
  ChefHat,
  Store,
  Ticket,
} from "lucide-react";
import type { Role } from "@/features/auth/roles";
import { cn } from "@/lib/classes";

interface NavItem {
  href: string;
  label: string;
  /** Shorter label used in the mobile tab bar. */
  shortLabel: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const CUSTOMER_ITEMS: NavItem[] = [
  {
    href: "/order",
    label: "Order food",
    shortLabel: "Order",
    icon: UtensilsCrossed,
    isActive: (p) => p === "/order" || p === "/checkout",
  },
  {
    href: "/party-orders",
    label: "Party catering",
    shortLabel: "Catering",
    icon: Sparkles,
    isActive: (p) => p.startsWith("/party-orders"),
  },
  {
    href: "/account",
    label: "My orders",
    shortLabel: "My orders",
    icon: ReceiptText,
    isActive: (p) => p.startsWith("/account") || p.startsWith("/orders/"),
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    icon: BarChart3,
    isActive: (p) => p.startsWith("/admin/dashboard"),
  },
  {
    href: "/admin/menu",
    label: "Menu & Stock",
    shortLabel: "Menu",
    icon: BookOpen,
    isActive: (p) => p.startsWith("/admin/menu"),
  },
  {
    href: "/admin/outlets",
    label: "Outlets",
    shortLabel: "Outlets",
    icon: Store,
    isActive: (p) => p.startsWith("/admin/outlets"),
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    shortLabel: "Coupons",
    icon: Ticket,
    isActive: (p) => p.startsWith("/admin/coupons"),
  },
  {
    href: "/kitchen",
    label: "Kitchen KDS",
    shortLabel: "Kitchen",
    icon: ChefHat,
    isActive: (p) => p.startsWith("/kitchen"),
  },
];

function itemsFor(role: Role): NavItem[] | null {
  if (role === "CUSTOMER") return CUSTOMER_ITEMS;
  if (role === "CENTRAL_ADMIN") return ADMIN_ITEMS;
  return null;
}

/** Inline pill navigation shown in the header on large screens. */
export function WorkspaceNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = itemsFor(role);

  if (!items) {
    return (
      <div className="hidden items-center gap-2 rounded-full border border-[#d6e8e2] bg-[#eef6f4] px-3.5 py-1.5 text-xs font-bold text-[#0f352d] sm:inline-flex">
        <ChefHat className="h-3.5 w-3.5 text-[#0f352d]" aria-hidden="true" />
        <span>Kitchen KDS Station</span>
      </div>
    );
  }

  return (
    <nav
      aria-label={role === "CUSTOMER" ? "Customer navigation" : "Admin navigation"}
      className="hidden items-center gap-0.5 rounded-2xl border border-[#e3d8c6] bg-[#f5efe4]/80 p-1 shadow-[inset_0_1px_2px_rgba(37,34,30,0.05)] lg:flex"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold tracking-tight transition-all",
              active
                ? "bg-[#0f352d] text-white shadow-xs"
                : "text-[#4e473d] hover:bg-[#fffdfa] hover:text-[#0f352d]",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                active ? "text-[#f4d6a9]" : "text-[#7a6f60]",
              )}
            />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom tab bar shown below the `lg` breakpoint. */
export function MobileTabBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = itemsFor(role);
  if (!items) return null;

  return (
    <nav
      aria-label={
        role === "CUSTOMER" ? "Customer navigation" : "Admin navigation"
      }
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e3d8c6] bg-[#fffdfa]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(20,18,14,0.07)] backdrop-blur-md lg:hidden"
    >
      <ul
        className="mx-auto grid max-w-xl"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-15 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold tracking-tight transition-colors",
                  active ? "text-[#0f352d]" : "text-[#7a6f60] hover:text-[#0f352d]",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-all",
                    active
                      ? "bg-[#0f352d] text-[#f4d6a9] shadow-[0_2px_8px_rgba(15,53,45,0.25)]"
                      : "group-hover:bg-[#f3ece0]",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
