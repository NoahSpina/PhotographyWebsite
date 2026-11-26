import Link from "next/link";
import { galleryPreviewHref } from "@/lib/admin/preview-return";

const backLink =
  "cursor-pointer text-sm text-neutral-500 transition-colors duration-500 hover:text-ink";

const actionLink =
  "cursor-pointer text-sm font-medium text-ink underline decoration-transparent underline-offset-4 transition-colors duration-500 hover:decoration-current";

type AlbumAdminBackNavProps = {
  albumId: string;
  variant: "selections" | "settings";
};

/** Shared back links between album selections and album settings. */
export function AlbumAdminBackNav({ albumId, variant }: AlbumAdminBackNavProps) {
  return (
    <nav aria-label="Back" className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Link href="/admin" className={backLink}>
        ← Dashboard
      </Link>
      <Link href="/admin/albums" className={backLink}>
        ← Albums
      </Link>
      {variant === "settings" ? (
        <Link href={`/admin/albums/${albumId}/selections`} className={backLink}>
          ← Selections
        </Link>
      ) : null}
    </nav>
  );
}

type AlbumAdminActionsProps = {
  albumId: string;
  previewFrom: string;
  showSettingsLink?: boolean;
};

export function AlbumAdminActions({
  albumId,
  previewFrom,
  showSettingsLink = true,
}: AlbumAdminActionsProps) {
  return (
    <nav aria-label="Album actions" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {showSettingsLink ? (
        <Link href={`/admin/albums/${albumId}`} className={actionLink}>
          Settings
        </Link>
      ) : null}
      <Link href={galleryPreviewHref(albumId, previewFrom)} className={actionLink}>
        Preview gallery
      </Link>
    </nav>
  );
}