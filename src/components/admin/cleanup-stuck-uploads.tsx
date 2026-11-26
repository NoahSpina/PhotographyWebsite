"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button-styles";

export function CleanupStuckUploads({ photoIds }: { photoIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (photoIds.length === 0) return null;

  async function runCleanup() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/photos/cleanup-stuck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Cleanup failed.";
        throw new Error(message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <button
        type="button"
        onClick={() => void runCleanup()}
        disabled={busy}
        className={buttonClass({ variant: "outline", size: "sm" })}
      >
        {busy ? "Cleaning up…" : "Clean up failed uploads"}
      </button>
      {error ? <p className="text-xs text-red-700 dark:text-red-400">{error}</p> : null}
    </div>
  );
}