import { NextResponse } from "next/server";
import { deletePhotosByIds } from "@/lib/admin/delete-photos";
import { verifyAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/validation";

const NO_STORE = { "Cache-Control": "no-store" };

type RouteContext = { params: Promise<{ photoId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
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
    const { deletedCount } = await deletePhotosByIds(admin.supabase, [photoId]);
    if (deletedCount === 0) {
      return errorResponse("Photo not found.", 404);
    }
    return NextResponse.json({ deletedCount }, { headers: NO_STORE });
  } catch (error) {
    console.error(
      "Photo delete failed:",
      error instanceof Error ? error.message : error,
    );
    return errorResponse(
      error instanceof Error ? error.message : "Could not delete the photo.",
      500,
    );
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}