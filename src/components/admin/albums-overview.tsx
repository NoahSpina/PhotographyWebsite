import Link from "next/link";
import { AlbumStatusBadge } from "@/components/admin/status-badge";
import { formatAlbumStorage } from "@/lib/admin/storage";
import { formatSelectionQuota, type AlbumOverview } from "@/lib/admin/review";

const actionClass =
  "cursor-pointer whitespace-nowrap text-ink underline decoration-transparent underline-offset-4 transition-colors duration-500 hover:decoration-current";

export function AlbumsOverview({
  albums,
  albumTotal,
}: {
  albums: AlbumOverview[] | null;
  albumTotal: number | null;
}) {
  const hasMore = albumTotal !== null && albums !== null && albumTotal > albums.length;

  return (
    <section className="space-y-4" aria-labelledby="albums-overview-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="albums-overview-heading" className="text-lg font-medium">
            Albums overview
          </h2>
          {albums && albums.length > 0 ? (
            <p className="mt-1 text-sm text-neutral-500">
              {hasMore ? `${albums.length} most recent albums.` : "Newest first."}
            </p>
          ) : null}
        </div>
        <Link
          href="/admin/albums"
          className="cursor-pointer text-sm text-neutral-500 transition-colors duration-500 hover:text-ink"
        >
          All albums
        </Link>
      </div>

      {albums === null ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Albums could not be loaded.
        </p>
      ) : albums.length === 0 ? (
        <p className="border border-hairline px-4 py-8 text-sm text-neutral-500">
          No albums yet.{" "}
          <Link href="/admin/albums" className={actionClass}>
            Create one
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto border border-hairline">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs uppercase tracking-[0.16em] text-neutral-500">
                <th scope="col" className="px-4 py-3 font-medium">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Photos
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Storage
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Selections
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.id} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className="px-4 py-3 text-left text-sm font-medium">
                    <Link
                      href={`/admin/albums/${album.id}/selections`}
                      className="cursor-pointer underline decoration-transparent underline-offset-4 transition-colors duration-500 hover:decoration-current"
                    >
                      {album.title}
                    </Link>
                  </th>
                  <td className="max-w-48 truncate px-4 py-3 text-neutral-600">{album.clientLabel}</td>
                  <td className="px-4 py-3">
                    <AlbumStatusBadge status={album.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{countOrDash(album.photoCount)}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">
                    {formatAlbumStorage(album.storageBytes, album.storagePartial)}
                  </td>
                  <td className="px-4 py-3">
                    {album.selectionCount === null
                      ? "—"
                      : formatSelectionQuota(album.selectionCount, album.quota)}
                  </td>
                  <td className="px-4 py-3">
                    {album.notesCount === null ? (
                      "—"
                    ) : album.notesCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-espresso px-2 py-0.5 text-xs font-medium text-alabaster tabular-nums">
                        {album.notesCount}
                      </span>
                    ) : (
                      <span className="tabular-nums text-neutral-500">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function countOrDash(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-US");
}
