import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-[#d6c9b6] bg-gradient-to-b from-[#fffdfa] to-[#faf5ec] px-6 py-12 text-center shadow-xs sm:px-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e3d4be] bg-[#fcf6eb] text-[#0f352d] shadow-2xs">
        <UtensilsCrossed className="h-6 w-6 text-[#c99b53]" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-bold text-[#0f352d]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5f574c]">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0f352d] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#08231d]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
