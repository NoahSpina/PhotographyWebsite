import { safeInternalPath } from "@/lib/auth/paths";
import { isUuid } from "@/lib/validation";

export type AdminPreviewReturn = {
  href: string;
  label: string;
};

/**
 * Where an admin gallery preview should return after `from` is validated.
 * Unknown paths fall back to the album's selections review.
 */
export function resolveAdminPreviewReturn(
  from: string | null | undefined,
  albumId: string,
): AdminPreviewReturn {
  const fallback = {
    href: `/admin/albums/${albumId}/selections`,
    label: "Back to selections",
  };
  if (!isUuid(albumId)) return fallback;

  const stripped = from?.split("?")[0]?.split("#")[0];
  const path = safeInternalPath(stripped);
  if (!path) return fallback;

  if (path === "/admin") {
    return { href: path, label: "Back to dashboard" };
  }
  if (path === "/admin/albums") {
    return { href: path, label: "Back to albums" };
  }
  if (path === `/admin/albums/${albumId}/selections`) {
    return { href: path, label: "Back to selections" };
  }
  if (path === `/admin/albums/${albumId}`) {
    return { href: path, label: "Back to settings" };
  }

  return fallback;
}

/** Client gallery URL that preserves the admin screen to return to. */
export function galleryPreviewHref(albumId: string, from: string): string {
  return `/gallery/${albumId}?${new URLSearchParams({ from })}`;
}