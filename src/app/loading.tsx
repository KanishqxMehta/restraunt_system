export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16" role="status">
      <p className="text-sm text-stone-600">Loading your workspace…</p>
      <div
        className="mt-6 h-40 animate-pulse rounded-2xl bg-stone-200"
        aria-hidden="true"
      />
    </main>
  );
}
