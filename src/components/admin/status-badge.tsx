import type { AlbumStatus, PhotoStatus } from "@/types";

const BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

const ALBUM_STYLES: Record<AlbumStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  archived: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const PHOTO_STYLES: Record<PhotoStatus, string> = {
  uploading: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  processing: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const LABELS: Record<AlbumStatus | PhotoStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export function AlbumStatusBadge({ status }: { status: AlbumStatus }) {
  return <span className={`${BASE} ${ALBUM_STYLES[status]}`}>{LABELS[status]}</span>;
}

export function PhotoStatusBadge({ status, label }: { status: PhotoStatus; label?: string }) {
  return <span className={`${BASE} ${PHOTO_STYLES[status]}`}>{label ?? LABELS[status]}</span>;
}
