import Link from "next/link";
import credits from "../../../public/menu/credits.json";
export default function PhotoCreditsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/order" className="text-sm font-semibold text-[#133d34] underline hover:text-[#0c2a23]">
        ← Back to the menu
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold text-[#133d34]">Food photography credits</h1>
      <p className="mt-4 text-sm leading-7 text-[#635b50]">
        Representative demo photographs from Wikimedia Commons. Wikimedia
        thumbnails are served locally and may be scaled or cropped by the
        interface. Each photograph retains its original licence, including
        ShareAlike terms where applicable.
      </p>
      <ul className="mt-8 space-y-6">
        {credits.map((credit) => (
          <li
            key={credit.file}
            className="rounded-2xl border border-[#ded5c6] bg-[#fffdfa] p-5 shadow-xs"
          >
            <h2 className="font-bold text-[#133d34]">{credit.title}</h2>
            <p className="mt-2 text-sm text-[#635b50]">{credit.author}</p>
            <p className="mt-3 flex gap-4 text-sm font-semibold text-[#4a1d5a]">
              <a href={credit.source} className="underline hover:text-[#2b1035]">
                Source photograph
              </a>
              <a href={credit.licenseUrl} className="underline hover:text-[#2b1035]">
                {credit.license}
              </a>
              <a href={credit.file} className="underline hover:text-[#2b1035]">
                Local file
              </a>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
