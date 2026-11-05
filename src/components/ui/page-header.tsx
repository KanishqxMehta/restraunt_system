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
    <header className="mb-8 max-w-2xl">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#4a1d5a]">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-[#133d34] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-base leading-7 text-[#524d45]">{description}</p>
    </header>
  );
}
