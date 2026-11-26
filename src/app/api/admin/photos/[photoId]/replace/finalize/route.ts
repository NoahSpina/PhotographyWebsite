import { NextResponse } from "next/server";
import { finalizePhotoReplace } from "@/lib/admin/replace-photo";
import { verifyAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/validation";

const NO_STORE = { "Cache-Control": "no-store" };

type RouteContext = { params: Promise<{ photoId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const admin = await verifyAdmin();
  if (!admin.ok) {
    return errorResponse(
      admin.reason === "unauthenticated" ? "Sign in to manage photos." : "Admin access required.",
      admin.reason === "unauthenticated" ? 401 : 403,
    );
  }

  const { photoId } = await context.params;
  if (!isUuid(photoId)) {
    return errorResponse("Unknown photo.", 400);
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const options = parseFinalizeBody(body);
  if (typeof options === "string") {
    return errorResponse(options, 400);
  }

  try {
    await finalizePhotoReplace(admin.supabase, photoId, options);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finalize the replacement.";
    const status =
      message === "Photo not found." ? 404 : message.includes("not found in storage") ? 400 : 500;
    return errorResponse(message, status);
  }
}

function parseFinalizeBody(
  body: unknown,
): { selectionId?: string; markCompleted?: boolean } | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }
  const { selectionId, markCompleted } = body as Record<string, unknown>;
  if (selectionId !== undefined && typeof selectionId !== "string") {
    return "selectionId must be a string.";
  }
  if (selectionId !== undefined && !isUuid(selectionId)) {
    return "selectionId must be a UUID.";
  }
  if (markCompleted !== undefined && typeof markCompleted !== "boolean") {
    return "markCompleted must be a boolean.";
  }
  return { selectionId, markCompleted: markCompleted === true };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}