import Image from "next/image";
import Link from "next/link";
import { Timestamp } from "@/components/admin/timestamp";
import type { ActivityItem } from "@/lib/admin/review";

export function RecentActivity({ items }: { items: ActivityItem[] | null }) {
  return (
    <section className="space-y-4" aria-labelledby="recent-activity-heading">
      <h2 id="recent-activity-heading" className="text-lg font-medium">
        Recent retouching notes & activity
      </h2>

      {items === null ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Recent selections could not be loaded.
        </p>
      ) : items.length === 0 ? (
        <p className="border border-hairline px-4 py-8 text-sm text-neutral-500">
          No client selections yet. Favorites and retouching notes will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-hairline border border-hairline">
          {items.map((item) => (
            <li key={item.id} className={item.note ? "bg-linen/70" : undefined}>
              <Link
                href={`/admin/albums/${item.albumId}/selections`}
                className="flex cursor-pointer items-start gap-4 px-4 py-3.5 transition-colors duration-500 hover:bg-linen"
              >
                <span className="relative block size-16 shrink-0 overflow-hidden bg-linen">
                  {item.thumbUrl ? (
                    <Image
                      src={item.thumbUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-neutral-500">
                      No proof
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{item.albumTitle}</span>
                    {item.note ? (
                      <span className="inline-flex items-center rounded-full bg-espresso px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-alabaster">
                        Note
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    {item.clientLabel}
                  </span>
                  <span
                    className={`mt-1.5 block whitespace-pre-wrap break-words text-sm leading-relaxed ${
                      item.note ? "text-ink" : "text-neutral-500"
                    }`}
                  >
                    {item.note ?? "Selected without note"}
                  </span>
                </span>
                <Timestamp
                  iso={item.createdAt}
                  relative
                  className="shrink-0 pt-0.5 text-xs text-neutral-500"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
