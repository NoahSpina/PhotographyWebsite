import { NextResponse } from "next/server";
import { abortPhotoReplace } from "@/lib/admin/replace-photo";
import { verifyAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/validation";

const NO_STORE = { "Cache-Control": "no-store" };

type RouteContext = { params: Promise<{ photoId: string }> };

export async function POST(_request: Request, context: RouteContext) {
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

  try {
    await abortPhotoReplace(admin.supabase, photoId);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not abort the replacement.";
    const status = message === "Photo not found." ? 404 : 500;
    return errorResponse(message, status);
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}