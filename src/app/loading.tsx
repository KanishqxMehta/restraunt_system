export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16" role="status">
      <p className="text-sm font-semibold text-[#133d34]">Loading your workspace…</p>
      <div
        className="mt-6 h-40 animate-pulse rounded-2xl bg-[#ede5d8]"
        aria-hidden="true"
      />
    </main>
  );
}
