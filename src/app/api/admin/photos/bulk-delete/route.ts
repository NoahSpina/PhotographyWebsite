import { NextResponse } from "next/server";
import { deletePhotosByIds, MAX_BULK_DELETE } from "@/lib/admin/delete-photos";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const photoIds = parsePhotoIds(body);
  if (typeof photoIds === "string") {
    return errorResponse(photoIds, 400);
  }
  if (photoIds.length === 0) {
    return errorResponse("photoIds must include at least one UUID.", 400);
  }
  if (photoIds.length > MAX_BULK_DELETE) {
    return errorResponse(`At most ${MAX_BULK_DELETE} photos can be deleted at once.`, 400);
  }

  try {
    const result = await deletePhotosByIds(admin.supabase, photoIds);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error(
      "Bulk photo delete failed:",
      error instanceof Error ? error.message : error,
    );
    return errorResponse(
      error instanceof Error ? error.message : "Could not delete photos.",
      500,
    );
  }
}

function parsePhotoIds(body: unknown): string[] | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }
  const { photoIds } = body as Record<string, unknown>;
  if (!Array.isArray(photoIds)) {
    return "photoIds must be an array of UUIDs.";
  }
  for (const id of photoIds) {
    if (typeof id !== "string") {
      return "Each photoId must be a string.";
    }
  }
  return photoIds;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}