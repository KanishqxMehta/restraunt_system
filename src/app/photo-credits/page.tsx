import Link from "next/link";
import credits from "../../../public/menu/credits.json";
export default function PhotoCreditsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/order" className="text-sm text-emerald-900 underline">
        Back to the menu
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">Food photography credits</h1>
      <p className="mt-4 text-sm leading-7 text-stone-600">
        Representative demo photographs from Wikimedia Commons. Wikimedia
        thumbnails are served locally and may be scaled or cropped by the
        interface. Each photograph retains its original licence, including
        ShareAlike terms where applicable.
      </p>
      <ul className="mt-8 space-y-6">
        {credits.map((credit) => (
          <li
            key={credit.file}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <h2 className="font-semibold">{credit.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{credit.author}</p>
            <p className="mt-3 flex gap-4 text-sm text-emerald-900">
              <a href={credit.source} className="underline">
                Source photograph
              </a>
              <a href={credit.licenseUrl} className="underline">
                {credit.license}
              </a>
              <a href={credit.file} className="underline">
                Local file
              </a>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
