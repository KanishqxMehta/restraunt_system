export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-orange-800">
        Company A · Direct ordering
      </p>
      <h1 className="text-5xl font-semibold tracking-tight">A fresh start.</h1>
      <p className="max-w-xl text-lg leading-8 text-stone-600">
        The project foundation is ready. Customer ordering, central menu
        management and the kitchen display will arrive in the next iterations.
      </p>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Iteration 0 · Repository and development setup
      </div>
    </main>
  );
}
