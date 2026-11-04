"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-2xl font-semibold">
        We couldn&apos;t load this page
      </h1>
      <p className="my-5 text-stone-600">
        The service may be temporarily unavailable. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
