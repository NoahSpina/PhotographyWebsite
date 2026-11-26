import "server-only";
import { proofUrl } from "@/lib/aws/cloudfront";
import type { GalleryPhoto, GallerySelection } from "@/lib/gallery/types";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

// These rows become Client Component props. Never add master_s3_key.
const GALLERY_PHOTO_COLUMNS = "id, proof_s3_key, thumb_s3_key, width, height";

/** Ready photos in display order, mapped to CloudFront proof URLs. */
export async function loadGalleryPhotos(
  supabase: ServerSupabaseClient,
  albumId: string,
): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from("photos")
    .select(GALLERY_PHOTO_COLUMNS)
    .eq("album_id", albumId)
    .eq("status", "ready")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load gallery photos:", error.message);
    throw new Error("The gallery photos could not be loaded.");
  }

  const photos: GalleryPhoto[] = [];
  for (const row of data) {
    if (!row.proof_s3_key || !row.thumb_s3_key) continue;
    try {
      photos.push({
        id: row.id,
        thumbUrl: proofUrl(row.thumb_s3_key),
        proofUrl: proofUrl(row.proof_s3_key),
        width: row.width,
        height: row.height,
      });
    } catch (urlError) {
      console.error(
        `Skipping photo ${row.id}:`,
        urlError instanceof Error ? urlError.message : urlError,
      );
    }
  }
  return photos;
}

export async function loadGallerySelections(
  supabase: ServerSupabaseClient,
  albumId: string,
  clientId: string,
): Promise<GallerySelection[]> {
  const { data, error } = await supabase
    .from("selections")
    .select("photo_id, notes, retouch_status, admin_reply, admin_replied_at")
    .eq("album_id", albumId)
    .eq("client_id", clientId);

  if (error) {
    console.error("Could not load selections:", error.message);
    throw new Error("Your selections could not be loaded.");
  }
  return data.map((row) => ({
    photoId: row.photo_id,
    notes: row.notes,
    retouchStatus: row.retouch_status,
    adminReply: row.admin_reply,
    adminRepliedAt: row.admin_replied_at,
  }));
}
