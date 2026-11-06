export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-3.5 py-1 shadow-2xs">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-[#c99b53]"
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4a1d5a]">
          {eyebrow}
        </p>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-[#0f352d] sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-7 text-[#575046] sm:text-base">
        {description}
      </p>
    </header>
  );
}
