import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { createPresignedPutUrl, masterObjectKey } from "@/lib/aws/s3";
import {
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_TTL_SECONDS,
  formatBytes,
  isAllowedImageType,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from "@/lib/uploads";
import { isUuid } from "@/lib/validation";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin.ok) {
    return errorResponse(
      admin.reason === "unauthenticated" ? "Sign in to upload photos." : "Admin access required.",
      admin.reason === "unauthenticated" ? 401 : 403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const parsed = parsePresignRequest(body);
  if (typeof parsed === "string") {
    return errorResponse(parsed, 400);
  }

  const { supabase } = admin;
  const { albumId, contentType, fileSize } = parsed;

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .maybeSingle();

  if (albumError) {
    console.error("Presign could not read the album:", albumError.message);
    return errorResponse("Could not verify the album.", 500);
  }
  if (!album) {
    return errorResponse("Album not found.", 404);
  }

  const photoId = crypto.randomUUID();
  const masterKey = masterObjectKey(albumId, photoId, IMAGE_EXTENSIONS[contentType]);

  // Sign before inserting so a misconfigured bucket never leaves orphan rows.
  let uploadUrl: string;
  try {
    uploadUrl = await createPresignedPutUrl({
      key: masterKey,
      contentType,
      contentLength: fileSize,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error(
      "Presign could not sign the upload:",
      error instanceof Error ? error.message : error,
    );
    return errorResponse("Uploads are not configured on the server.", 500);
  }

  const { error: insertError } = await supabase.from("photos").insert({
    id: photoId,
    album_id: albumId,
    master_s3_key: masterKey,
    status: "uploading",
  });

  if (insertError) {
    console.error("Presign could not create the photo row:", insertError.message);
    return errorResponse("Could not register the photo.", 500);
  }

  const payload: PresignUploadResponse = { photoId, uploadUrl, masterKey };
  return NextResponse.json(payload, { status: 201, headers: NO_STORE });
}

function parsePresignRequest(body: unknown): PresignUploadRequest | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }

  const { albumId, fileName, contentType, fileSize } = body as Record<string, unknown>;

  if (!isUuid(albumId)) {
    return "albumId must be a UUID.";
  }
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 255) {
    return "fileName must be 1 to 255 characters.";
  }
  if (typeof contentType !== "string" || !isAllowedImageType(contentType)) {
    return "Only JPEG, PNG, and WebP images can be uploaded.";
  }
  if (typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize <= 0) {
    return "fileSize must be a positive integer.";
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    return `Files must be ${formatBytes(MAX_UPLOAD_BYTES)} or smaller.`;
  }

  return { albumId, fileName: fileName.trim(), contentType, fileSize };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}
