"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-8 shadow-sm sm:p-10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#0f352d]">
          We couldn&apos;t load this page
        </h1>
        <p className="my-4 text-sm leading-6 text-[#5f574c]">
          The service may be temporarily unavailable. Please try again.
        </p>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
