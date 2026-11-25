import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Keep this request-time. Cache Components would otherwise prerender it.
  await connection();

  const timestamp = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    // Storage metadata lives in Postgres, so this is a real database round trip
    // even before application tables exist. A successful call also counts as
    // activity for the free-tier keep-alive cron.
    const { error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("Supabase health check failed:", error.message);
      return NextResponse.json(
        { status: "error", db: "disconnected", timestamp },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { status: "ok", db: "connected", timestamp },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Supabase health check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { status: "error", db: "disconnected", timestamp },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
