import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera, ExternalLink, ShieldCheck } from "lucide-react";
import credits from "../../../public/menu/credits.json";

export default function PhotoCreditsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/order"
        className="inline-flex items-center gap-2 rounded-xl border border-[#dfd4c2] bg-[#fffdfa] px-4 py-2 text-xs font-bold text-[#0f352d] shadow-2xs transition hover:bg-[#faf7f2]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to the menu
      </Link>

      <header className="mt-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-3.5 py-1">
          <Camera className="h-3.5 w-3.5 text-[#4a1d5a]" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4a1d5a]">
            Wikimedia Commons Attribution
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold text-[#0f352d] sm:text-4xl">
          Food photography credits
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#575046] sm:text-base">
          Representative demo photographs from Wikimedia Commons. Wikimedia
          thumbnails are served locally and may be scaled or cropped by the
          interface. Each photograph retains its original licence, including
          ShareAlike terms where applicable.
        </p>
      </header>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {credits.map((credit) => (
          <li
            key={credit.file}
            className="flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] shadow-xs transition hover:border-[#0f352d]/40"
          >
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f2ebe0]">
                <Image
                  src={credit.file}
                  alt={credit.title}
                  fill
                  sizes="(min-width: 640px) 400px, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h2 className="font-display text-lg font-bold text-[#0f352d]">
                  {credit.title}
                </h2>
                <p className="mt-1.5 text-xs text-[#635b50]">{credit.author}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#ece3d5] bg-[#faf7f2] px-5 py-3.5 text-xs font-bold text-[#4a1d5a]">
              <a
                href={credit.source}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline decoration-[#dec9ec] underline-offset-4 hover:text-[#290e32]"
              >
                <span>Source photograph</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <span aria-hidden="true" className="text-[#c99b53]">
                ·
              </span>
              <a
                href={credit.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline decoration-[#dec9ec] underline-offset-4 hover:text-[#290e32]"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{credit.license}</span>
              </a>
              <span aria-hidden="true" className="text-[#c99b53]">
                ·
              </span>
              <a
                href={credit.file}
                className="underline decoration-[#dec9ec] underline-offset-4 hover:text-[#290e32]"
              >
                Local file
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
