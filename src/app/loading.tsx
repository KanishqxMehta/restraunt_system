export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8" role="status">
      <div className="inline-flex items-center gap-2.5 rounded-full border border-[#dfd4c2] bg-[#fffdfa] px-4 py-2 text-xs font-bold text-[#0f352d] shadow-2xs">
        <span
          aria-hidden="true"
          className="h-2 w-2 animate-ping rounded-full bg-[#c99b53]"
        />
        Loading your workspace…
      </div>
      <div
        className="mt-6 h-52 animate-pulse rounded-[2rem] border border-[#e5dbc9] bg-gradient-to-r from-[#f3ece0] via-[#faf7f2] to-[#f3ece0]"
        aria-hidden="true"
      />
      <div
        className="mt-6 grid gap-5 sm:grid-cols-3"
        aria-hidden="true"
      >
        <div className="h-44 animate-pulse rounded-3xl bg-[#f3ece0]" />
        <div className="h-44 animate-pulse rounded-3xl bg-[#f3ece0]" />
        <div className="h-44 animate-pulse rounded-3xl bg-[#f3ece0]" />
      </div>
    </main>
  );
}
