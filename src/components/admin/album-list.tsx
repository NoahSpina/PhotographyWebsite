import Link from "next/link";
import { AlbumStatusBadge } from "@/components/admin/status-badge";
import type { Album } from "@/types";

export type AlbumListItem = Pick<
  Album,
  "id" | "title" | "status" | "shoot_date" | "client_email" | "is_public_portfolio"
> & {
  selectionCount: number | null;
  notesCount: number | null;
};

export function AlbumList({ albums }: { albums: AlbumListItem[] }) {
  if (albums.length === 0) {
    return <p className="text-sm text-neutral-500">No albums yet. Create one above.</p>;
  }

  return (
    <ul className="divide-y divide-hairline border border-hairline">
      {albums.map((album) => (
        <li
          key={album.id}
          className="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-500 hover:bg-linen sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            href={`/admin/albums/${album.id}/selections`}
            className="min-w-0 flex-1 cursor-pointer"
          >
            <p className="truncate text-sm font-medium">{album.title}</p>
            <p className="truncate text-xs text-neutral-500">
              {[formatDate(album.shoot_date), album.client_email ?? "No client email"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Link>
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
            <SelectionCounts
              selectionCount={album.selectionCount}
              notesCount={album.notesCount}
            />
            <Link
              href={`/admin/albums/${album.id}`}
              className="cursor-pointer text-xs font-medium text-ink underline decoration-transparent underline-offset-4 transition-colors duration-500 hover:decoration-current"
              aria-label={`Album settings for ${album.title}`}
            >
              Settings
            </Link>
            {album.is_public_portfolio ? (
              <span className="text-xs text-neutral-500">Portfolio</span>
            ) : null}
            <AlbumStatusBadge status={album.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SelectionCounts({
  selectionCount,
  notesCount,
}: {
  selectionCount: number | null;
  notesCount: number | null;
}) {
  if (selectionCount === null || notesCount === null) {
    return <span className="text-xs text-neutral-500">Selections unavailable</span>;
  }

  const notesLabel = notesCount === 1 ? "note" : "notes";
  return (
    <p className="text-xs text-neutral-500">
      <span className="tabular-nums text-ink">
        {selectionCount.toLocaleString("en-US")} selected
      </span>
      <span aria-hidden="true"> · </span>
      <span className={notesCount > 0 ? "font-medium text-espresso" : "tabular-nums"}>
        {notesCount.toLocaleString("en-US")} {notesLabel}
      </span>
    </p>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
