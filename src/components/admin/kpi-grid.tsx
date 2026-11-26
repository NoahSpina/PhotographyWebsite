import { CleanupStuckUploads } from "@/components/admin/cleanup-stuck-uploads";
import { formatStorageFootprint } from "@/lib/admin/storage";
import type { DashboardModel } from "@/lib/admin/review";

type KpiGridProps = {
  albumCounts: DashboardModel["albumCounts"];
  photoCounts: DashboardModel["photoCounts"];
  selectionCount: number | null;
  notesCount: number | null;
  storageBytes: number | null;
  storagePartial: boolean;
  stuckPhotoIds: string[];
};

export function KpiGrid({
  albumCounts,
  photoCounts,
  selectionCount,
  notesCount,
  storageBytes,
  storagePartial,
  stuckPhotoIds,
}: KpiGridProps) {
  const attention = photoCounts
    ? attentionCopy(photoCounts)
    : null;

  return (
    <section aria-label="Studio summary">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="border border-hairline p-5">
          <p className="eyebrow text-neutral-500">Albums</p>
          <p className="mt-3 text-4xl font-light tabular-nums tracking-tight">
            {figure(albumCounts?.total ?? null)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {albumCounts
              ? `Published ${albumCounts.published} · Draft ${albumCounts.draft} · Archived ${albumCounts.archived}`
              : "Counts unavailable"}
          </p>
        </li>

        <li className="border border-hairline p-5">
          <p className="eyebrow text-neutral-500">Photos</p>
          <p className="mt-3 text-4xl font-light tabular-nums tracking-tight">
            {figure(photoCounts?.total ?? null)}
          </p>
          {attention ? (
            <p
              role="status"
              className={`mt-2 flex items-center gap-1.5 text-xs ${
                attention.severe ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${attention.severe ? "bg-red-700" : "bg-amber-600"}`}
              />
              {attention.label}
            </p>
          ) : (
            <p className="mt-2 text-xs text-neutral-500">
              {photoCounts ? "No uploads in progress" : "Counts unavailable"}
            </p>
          )}
          <CleanupStuckUploads photoIds={stuckPhotoIds} />
        </li>

        <li className="border border-hairline p-5">
          <p className="eyebrow text-neutral-500">Storage footprint</p>
          <p className="mt-3 text-2xl font-light tracking-tight">
            {formatStorageFootprint(storageBytes, storagePartial)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Masters on S3 (known file sizes only)</p>
        </li>

        <li className="border border-hairline p-5">
          <p className="eyebrow text-neutral-500">Client selections</p>
          <p className="mt-3 text-4xl font-light tabular-nums tracking-tight">
            {figure(selectionCount)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Favorited photos across albums</p>
        </li>

        <li className="border border-hairline p-5">
          <p className="eyebrow text-neutral-500">Retouching notes</p>
          <p className="mt-3 text-4xl font-light tabular-nums tracking-tight">
            {figure(notesCount)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Selections with written instructions</p>
        </li>

        <li className="border border-hairline bg-linen p-5 sm:col-span-2 lg:col-span-2">
          {/* TODO(phase-5): Replace this placeholder with paid-order revenue and order counts once Stripe webhooks update orders. */}
          <p className="eyebrow text-neutral-500">Revenue & orders</p>
          <p className="mt-3 text-3xl font-light tracking-tight text-neutral-500">
            Pending Stripe Setup
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Revenue and order totals will appear in this grid after payments are connected.
          </p>
        </li>
      </ul>
    </section>
  );
}

function figure(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US");
}

function attentionCopy(counts: {
  uploading: number;
  processing: number;
  failed: number;
}): { label: string; severe: boolean } | null {
  const parts: string[] = [];
  if (counts.uploading > 0) parts.push(`${counts.uploading} uploading`);
  if (counts.processing > 0) parts.push(`${counts.processing} processing`);
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);
  if (parts.length === 0) return null;
  return { label: parts.join(" · "), severe: counts.failed > 0 };
}
