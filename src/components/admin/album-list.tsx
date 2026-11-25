import Link from "next/link";
import { AlbumStatusBadge } from "@/components/admin/status-badge";
import type { Album } from "@/types";

export type AlbumListItem = Pick<
  Album,
  "id" | "title" | "status" | "shoot_date" | "client_email" | "is_public_portfolio"
>;

export function AlbumList({ albums }: { albums: AlbumListItem[] }) {
  if (albums.length === 0) {
    return <p className="text-sm text-neutral-500">No albums yet. Create one above.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {albums.map((album) => (
        <li key={album.id}>
          <Link
            href={`/admin/albums/${album.id}`}
            className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{album.title}</p>
              <p className="truncate text-xs text-neutral-500">
                {[formatDate(album.shoot_date), album.client_email ?? "No client email"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {album.is_public_portfolio ? (
                <span className="text-xs text-neutral-500">Portfolio</span>
              ) : null}
              <AlbumStatusBadge status={album.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
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
