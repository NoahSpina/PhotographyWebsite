import "server-only";

import { deletePhotosByIds } from "@/lib/admin/delete-photos";
import { abortPhotoReplace } from "@/lib/admin/replace-photo";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { PhotoStatus } from "@/types";

const STALE_UPLOAD_MS = 60 * 60 * 1000;

type StuckPhotoRow = {
  id: string;
  status: PhotoStatus;
  updated_at: string;
  superseded_s3_keys: string[] | null;
};

export function isStuckPhoto(row: StuckPhotoRow): boolean {
  if (row.status === "failed") return true;
  if (row.status !== "uploading") return false;
  return Date.now() - Date.parse(row.updated_at) > STALE_UPLOAD_MS;
}

export async function cleanupStuckPhotos(
  supabase: ServerSupabaseClient,
  photoIds: string[],
): Promise<{ aborted: number; deleted: number }> {
  if (photoIds.length === 0) return { aborted: 0, deleted: 0 };

  const { data, error } = await supabase
    .from("photos")
    .select("id, status, updated_at, superseded_s3_keys")
    .in("id", photoIds);

  if (error) {
    throw new Error("Could not load stuck photos.");
  }

  const rows = (data ?? []) as StuckPhotoRow[];
  const toAbort: string[] = [];
  const toDelete: string[] = [];

  for (const row of rows) {
    if (!isStuckPhoto(row)) continue;
    if (row.superseded_s3_keys && row.superseded_s3_keys.length > 0) {
      toAbort.push(row.id);
    } else {
      toDelete.push(row.id);
    }
  }

  for (const photoId of toAbort) {
    await abortPhotoReplace(supabase, photoId);
  }

  const { deletedCount } =
    toDelete.length > 0 ? await deletePhotosByIds(supabase, toDelete) : { deletedCount: 0 };

  return { aborted: toAbort.length, deleted: deletedCount };
}