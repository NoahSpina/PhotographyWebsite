import "server-only";

import {
  createPresignedPutUrl,
  deleteS3Objects,
  masterObjectExists,
  versionedMasterObjectKey,
} from "@/lib/aws/s3";
import {
  IMAGE_EXTENSIONS,
  UPLOAD_URL_TTL_SECONDS,
  isAllowedImageType,
  type AllowedImageType,
} from "@/lib/uploads";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { PhotoStatus } from "@/types";

type PhotoReplaceRow = {
  id: string;
  album_id: string;
  master_s3_key: string | null;
  proof_s3_key: string | null;
  thumb_s3_key: string | null;
  status: PhotoStatus;
  version: number;
  superseded_s3_keys: string[] | null;
};

export function snapshotKeys(row: Pick<PhotoReplaceRow, "master_s3_key" | "proof_s3_key" | "thumb_s3_key">) {
  return [row.master_s3_key, row.proof_s3_key, row.thumb_s3_key].filter(
    (key): key is string => !!key,
  );
}

export async function beginPhotoReplace(
  supabase: ServerSupabaseClient,
  photoId: string,
  input: { contentType: AllowedImageType; fileSize: number },
): Promise<{ uploadUrl: string }> {
  const { data: photo, error } = await supabase
    .from("photos")
    .select(
      "id, album_id, master_s3_key, proof_s3_key, thumb_s3_key, status, version, superseded_s3_keys",
    )
    .eq("id", photoId)
    .maybeSingle();

  if (error) {
    console.error("Replace could not load the photo:", error.message);
    throw new Error("Could not load the photo.");
  }
  if (!photo) {
    throw new Error("Photo not found.");
  }

  const row = photo as PhotoReplaceRow;
  if (row.status === "uploading" || row.status === "processing") {
    throw new Error("This photo is already being uploaded or processed.");
  }
  if (row.superseded_s3_keys && row.superseded_s3_keys.length > 0) {
    throw new Error("A previous replace was not finished. Finalize or abort it first.");
  }

  const nextVersion = row.version + 1;
  const extension = IMAGE_EXTENSIONS[input.contentType];
  const masterKey = versionedMasterObjectKey(row.album_id, row.id, nextVersion, extension);
  const superseded = snapshotKeys(row);

  const uploadUrl = await createPresignedPutUrl({
    key: masterKey,
    contentType: input.contentType,
    contentLength: input.fileSize,
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  const { error: updateError } = await supabase
    .from("photos")
    .update({
      master_s3_key: masterKey,
      version: nextVersion,
      file_size_bytes: input.fileSize,
      status: "uploading",
      superseded_s3_keys: superseded,
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("Replace could not update the photo row:", updateError.message);
    throw new Error("Could not register the replacement.");
  }

  return { uploadUrl };
}

export async function finalizePhotoReplace(
  supabase: ServerSupabaseClient,
  photoId: string,
  options?: { selectionId?: string; markCompleted?: boolean },
): Promise<void> {
  const { data: photo, error } = await supabase
    .from("photos")
    .select("id, master_s3_key, superseded_s3_keys, status")
    .eq("id", photoId)
    .maybeSingle();

  if (error || !photo) {
    throw new Error(photo ? "Could not load the photo." : "Photo not found.");
  }

  if (!photo.master_s3_key) {
    throw new Error("The photo has no master key.");
  }
  if (!photo.superseded_s3_keys || photo.superseded_s3_keys.length === 0) {
    throw new Error("Nothing to finalize. Start a replace upload first.");
  }

  const exists = await masterObjectExists(photo.master_s3_key);
  if (!exists) {
    throw new Error("The new master file was not found in storage. Upload it first.");
  }

  await deleteS3Objects(photo.superseded_s3_keys);

  const { error: updateError } = await supabase
    .from("photos")
    .update({ superseded_s3_keys: null })
    .eq("id", photoId);

  if (updateError) {
    console.error("Finalize could not clear superseded keys:", updateError.message);
    throw new Error("Could not finalize the replacement.");
  }

  if (options?.markCompleted && options.selectionId) {
    const { error: selectionError } = await supabase
      .from("selections")
      .update({ retouch_status: "completed" })
      .eq("id", options.selectionId)
      .eq("photo_id", photoId);

    if (selectionError) {
      console.error("Finalize could not mark selection completed:", selectionError.message);
    }
  }
}

export async function abortPhotoReplace(
  supabase: ServerSupabaseClient,
  photoId: string,
): Promise<void> {
  const { data: photo, error } = await supabase
    .from("photos")
    .select(
      "id, master_s3_key, proof_s3_key, thumb_s3_key, status, version, superseded_s3_keys",
    )
    .eq("id", photoId)
    .maybeSingle();

  if (error || !photo) {
    throw new Error(photo ? "Could not load the photo." : "Photo not found.");
  }

  const row = photo as PhotoReplaceRow;
  if (!row.superseded_s3_keys || row.superseded_s3_keys.length === 0) {
    return;
  }

  const previousMaster = row.superseded_s3_keys[0] ?? null;
  await deleteS3Objects([row.master_s3_key]);

  const restoredStatus: PhotoStatus = row.proof_s3_key ? "ready" : "failed";

  const { error: updateError } = await supabase
    .from("photos")
    .update({
      master_s3_key: previousMaster,
      version: Math.max(1, row.version - 1),
      status: restoredStatus,
      superseded_s3_keys: null,
    })
    .eq("id", photoId);

  if (updateError) {
    console.error("Abort could not restore the photo row:", updateError.message);
    throw new Error("Could not abort the replacement.");
  }
}

export function parseReplaceBody(body: unknown): { contentType: AllowedImageType; fileSize: number } | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }
  const { contentType, fileSize } = body as Record<string, unknown>;
  if (typeof contentType !== "string" || !isAllowedImageType(contentType)) {
    return "Only JPEG, PNG, and WebP images can be uploaded.";
  }
  if (typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize <= 0) {
    return "fileSize must be a positive integer.";
  }
  return { contentType, fileSize };
}