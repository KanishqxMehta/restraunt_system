"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "../client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Couldn't sign out. Try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Couldn't connect. Try signing out again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="relative text-right">
      <Button
        variant="secondary"
        onClick={signOut}
        disabled={pending}
        aria-label="Sign out"
        title="Sign out"
        className="min-h-9 px-2.5 py-1.5 text-xs font-bold sm:px-3"
      >
        <LogOut className="h-3.5 w-3.5 text-[#655c50]" aria-hidden="true" />
        <span className="hidden sm:inline">
          {pending ? "Signing out…" : "Sign out"}
        </span>
      </Button>
      {error && (
        <p
          role="alert"
          className="absolute top-full right-0 z-40 mt-2 w-56 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-800 shadow-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
