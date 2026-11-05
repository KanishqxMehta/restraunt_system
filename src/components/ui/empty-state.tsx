export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#ded5c6] bg-[#fffdfa] p-8 text-center shadow-xs">
      <h2 className="text-lg font-bold text-[#133d34]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#635b50]">
        {description}
      </p>
    </div>
  );
}
