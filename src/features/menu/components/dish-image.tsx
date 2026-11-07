"use client";

import { useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/classes";

interface DishImageProps {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  emptyLabel?: string;
}

function isValidImageSource(value: string): boolean {
  if (value.startsWith("/")) return true;
  if (value.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function DishImage({
  src,
  alt,
  sizes = "(min-width: 1024px) 420px, 90vw",
  className,
  emptyLabel = "No image uploaded",
}: DishImageProps) {
  const trimmed = src?.trim() ?? "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const isSupported = Boolean(trimmed) && isValidImageSource(trimmed);
  const hasError = failedSrc === trimmed;

  if (!isSupported || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-1.5 bg-[#f2ebe0] px-3 text-center text-xs font-medium text-[#8a7f70]">
        <UtensilsCrossed className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{hasError ? "External photo unavailable" : emptyLabel}</span>
      </div>
    );
  }

  const isLocalAsset = trimmed.startsWith("/");

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={!isLocalAsset}
      onError={() => setFailedSrc(trimmed)}
      className={cn("object-cover", className)}
    />
  );
}
