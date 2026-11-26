import { NextResponse } from "next/server";
import { cleanupStuckPhotos, isStuckPhoto } from "@/lib/admin/cleanup-stuck";
import { verifyAdmin } from "@/lib/auth/admin";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin.ok) {
    return errorResponse(
      admin.reason === "unauthenticated" ? "Sign in to manage photos." : "Admin access required.",
      admin.reason === "unauthenticated" ? 401 : 403,
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const photoIds = parsePhotoIds(body);
  if (typeof photoIds === "string") {
    return errorResponse(photoIds, 400);
  }

  let ids = photoIds;
  if (ids.length === 0) {
    const { data, error } = await admin.supabase
      .from("photos")
      .select("id, status, updated_at, superseded_s3_keys");
    if (error) {
      return errorResponse("Could not load photos.", 500);
    }
    ids = (data ?? []).filter((row) => isStuckPhoto(row)).map((row) => row.id);
  }

  try {
    const result = await cleanupStuckPhotos(admin.supabase, ids);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error(
      "Cleanup stuck uploads failed:",
      error instanceof Error ? error.message : error,
    );
    return errorResponse(
      error instanceof Error ? error.message : "Could not clean up uploads.",
      500,
    );
  }
}

function parsePhotoIds(body: unknown): string[] | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }
  const { photoIds } = body as Record<string, unknown>;
  if (photoIds === undefined) return [];
  if (!Array.isArray(photoIds)) return "photoIds must be an array.";
  for (const id of photoIds) {
    if (typeof id !== "string") return "Each photoId must be a string.";
  }
  return photoIds;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}