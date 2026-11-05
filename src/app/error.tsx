"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-[#133d34]">
        We couldn&apos;t load this page
      </h1>
      <p className="my-5 text-sm leading-6 text-[#635b50]">
        The service may be temporarily unavailable. Please try again.
      </p>
      <Button variant="primary" onClick={reset}>Try again</Button>
    </main>
  );
}
