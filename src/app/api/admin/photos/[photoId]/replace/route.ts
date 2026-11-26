import { NextResponse } from "next/server";
import { beginPhotoReplace, parseReplaceBody } from "@/lib/admin/replace-photo";
import { verifyAdmin } from "@/lib/auth/admin";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/uploads";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const parsed = parseReplaceBody(body);
  if (typeof parsed === "string") {
    return errorResponse(parsed, 400);
  }
  if (parsed.fileSize > MAX_UPLOAD_BYTES) {
    return errorResponse(
      `Files must be ${formatBytes(MAX_UPLOAD_BYTES)} or smaller. Export a print-ready JPEG instead of a RAW or TIFF.`,
      400,
    );
  }

  try {
    const payload = await beginPhotoReplace(admin.supabase, photoId, parsed);
    return NextResponse.json(payload, { status: 201, headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the replacement.";
    const status = message === "Photo not found." ? 404 : 400;
    return errorResponse(message, status);
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}