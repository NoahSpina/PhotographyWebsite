import "server-only";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { Album } from "@/types";

export type GalleryAlbum = Pick<
  Album,
  "id" | "title" | "shoot_date" | "status" | "client_id" | "client_email" | "assigned_package_id"
>;

const GALLERY_ALBUM_COLUMNS =
  "id, title, shoot_date, status, client_id, client_email, assigned_package_id";

export type GalleryAccess =
  | {
      ok: true;
      supabase: ServerSupabaseClient;
      userId: string;
      isAdmin: boolean;
      album: GalleryAlbum;
    }
  | { ok: false; reason: "unauthenticated" | "not_found" | "error" };

/**
 * Gate for the proofing gallery page and its Server Actions. Lets through
 * the album's client while it is published, and admins at any status.
 * Everyone else gets `not_found` so album ids cannot be probed.
 *
 * Returns the RLS-bound client so follow-up queries are also checked by
 * policies.
 */
export async function getGalleryAccess(albumId: string): Promise<GalleryAccess> {
  if (!isUuid(albumId)) return { ok: false, reason: "not_found" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { ok: false, reason: "unauthenticated" };

  const [profileResult, albumResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase.from("albums").select(GALLERY_ALBUM_COLUMNS).eq("id", albumId).maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("Gallery access could not read the profile:", profileResult.error.message);
  }
  if (albumResult.error) {
    console.error("Gallery access could not read the album:", albumResult.error.message);
    return { ok: false, reason: "error" };
  }

  const album = albumResult.data;
  if (!album) return { ok: false, reason: "not_found" };

  // RLS also exposes public portfolio albums to every signed-in user, so
  // ownership has to be checked here, not just inferred from the read.
  const isAdmin = profileResult.data?.role === "admin";
  const isOwner = album.client_id === userId && album.status === "published";
  if (!isAdmin && !isOwner) return { ok: false, reason: "not_found" };

  return { ok: true, supabase, userId, isAdmin, album };
}
