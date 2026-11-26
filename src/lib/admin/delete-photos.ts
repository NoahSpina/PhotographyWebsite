import "server-only";

import { deleteS3Objects } from "@/lib/aws/s3";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

const BULK_DELETE_MAX = 500;

type PhotoDeleteRow = {
  id: string;
  master_s3_key: string | null;
  proof_s3_key: string | null;
  thumb_s3_key: string | null;
  superseded_s3_keys: string[] | null;
};

export async function deletePhotosByIds(
  supabase: ServerSupabaseClient,
  photoIds: string[],
): Promise<{ deletedCount: number }> {
  const ids = [...new Set(photoIds.filter(isUuid))];
  if (ids.length === 0) {
    return { deletedCount: 0 };
  }
  if (ids.length > BULK_DELETE_MAX) {
    throw new Error(`At most ${BULK_DELETE_MAX} photos can be deleted at once.`);
  }

  const { data: rows, error: loadError } = await supabase
    .from("photos")
    .select("id, master_s3_key, proof_s3_key, thumb_s3_key, superseded_s3_keys")
    .in("id", ids);

  if (loadError) {
    console.error("Could not load photos for deletion:", loadError.message);
    throw new Error("Could not load photos for deletion.");
  }

  const loaded = (rows ?? []) as PhotoDeleteRow[];
  if (loaded.length === 0) {
    return { deletedCount: 0 };
  }

  const keys = collectS3Keys(loaded);
  await deleteS3Objects(keys);

  const { error: coverError } = await supabase
    .from("albums")
    .update({ cover_photo_id: null })
    .in("cover_photo_id", loaded.map((row) => row.id));

  if (coverError) {
    console.error("Could not clear album covers:", coverError.message);
    throw new Error("Could not clear album covers.");
  }

  const { error: deleteError, count } = await supabase
    .from("photos")
    .delete({ count: "exact" })
    .in("id", loaded.map((row) => row.id));

  if (deleteError) {
    console.error("Could not delete photo rows:", deleteError.message);
    throw new Error("Could not delete photo rows.");
  }

  return { deletedCount: count ?? loaded.length };
}

function collectS3Keys(rows: PhotoDeleteRow[]): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    if (row.master_s3_key) keys.push(row.master_s3_key);
    if (row.proof_s3_key) keys.push(row.proof_s3_key);
    if (row.thumb_s3_key) keys.push(row.thumb_s3_key);
    if (row.superseded_s3_keys) {
      keys.push(...row.superseded_s3_keys);
    }
  }
  return keys;
}

export const MAX_BULK_DELETE = BULK_DELETE_MAX;