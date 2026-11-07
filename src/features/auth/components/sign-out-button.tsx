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
    <div className="text-right">
      <Button
        variant="secondary"
        onClick={signOut}
        disabled={pending}
        className="min-h-9 px-3 py-1.5 text-xs font-bold"
      >
        <LogOut className="h-3.5 w-3.5 text-[#655c50]" aria-hidden="true" />
        <span>{pending ? "Signing out…" : "Sign out"}</span>
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
