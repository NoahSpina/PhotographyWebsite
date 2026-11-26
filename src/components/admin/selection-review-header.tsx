import { AlbumAdminActions, AlbumAdminBackNav } from "@/components/admin/album-admin-nav";
import { AlbumStatusBadge } from "@/components/admin/status-badge";
import { formatSelectionQuota, type ReviewAlbumSummary } from "@/lib/admin/review";

export function SelectionReviewHeader({ album }: { album: ReviewAlbumSummary }) {
  const meta = [album.shootDateLabel, album.clientLabel].filter(Boolean).join(" · ");
  const previewFrom = `/admin/albums/${album.id}/selections`;

  return (
    <header className="space-y-6">
      <AlbumAdminBackNav albumId={album.id} variant="selections" />

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{album.title}</h1>
            <AlbumStatusBadge status={album.status} />
          </div>
          <AlbumAdminActions albumId={album.id} previewFrom={previewFrom} />
        </div>
        {meta ? <p className="text-sm text-neutral-500">{meta}</p> : null}
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Photos</dt>
            <dd className="mt-1 tabular-nums">{album.photoCount.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Selections</dt>
            <dd className="mt-1">{formatSelectionQuota(album.selectionCount, album.quota)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">
              Retouching notes
            </dt>
            <dd className="mt-1 tabular-nums">
              {album.notedPhotoCount.toLocaleString("en-US")}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
