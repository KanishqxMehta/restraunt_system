import { requirePageViewer } from "@/features/auth/session";
import { listAdminMenu } from "@/features/menu/repository";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney } from "@/lib/format";
export default async function AdminMenuPage() {
  const viewer = await requirePageViewer(["CENTRAL_ADMIN"]);
  const items = await listAdminMenu(viewer);
  return (
    <WorkspaceShell viewer={viewer}>
      <PageHeader
        eyebrow="Central workspace"
        title="One menu. Every outlet."
        description="The shared menu and preparation settings are persisted. Editing controls arrive in the menu administration iteration. All prices include 5% GST."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-stone-200 bg-white p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  {item.category}
                </p>
                <h2 className="mt-2 text-lg font-semibold">{item.name}</h2>
              </div>
              <span
                className={
                  item.isVeg
                    ? "text-xs font-semibold text-emerald-800"
                    : "text-xs font-semibold text-red-800"
                }
              >
                {item.isVeg ? "▣ Veg" : "▲ Non-veg"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {item.description}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {item.portions.flatMap((portion) =>
                portion.prices.map((price) => (
                  <li key={price.id} className="flex justify-between gap-3">
                    <span>
                      {portion.name} · {price.city}
                    </span>
                    <span className="font-medium">
                      {formatMoney(price.pricePaise)}
                    </span>
                  </li>
                )),
              )}
            </ul>
            <div className="mt-5 border-t border-stone-100 pt-4 text-xs leading-6 text-stone-500">
              <p>
                Base preparation: {item.basePrepMinutes} min · Batch:{" "}
                {item.batchCapacity}
              </p>
              <p>Allergens: {item.allergens.join(", ") || "None declared"}</p>
              <p>
                Spice: {item.spiceLevel}/3 ·{" "}
                {item.availability.filter((entry) => entry.isAvailable).length}{" "}
                outlets available
              </p>
            </div>
          </article>
        ))}
      </div>
    </WorkspaceShell>
  );
}
