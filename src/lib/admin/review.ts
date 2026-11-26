import { normalizeNote } from "@/lib/gallery/types";
import type { AlbumStatus, PhotoStatus, RetouchStatus } from "@/types";

/**
 * Shapes for the admin dashboard and selections review.
 * Safe to import from Client Components: CloudFront proof URLs only,
 * never S3 keys.
 */

/** `known: false` means no package or paid order set a limit. `limit: null` means unlimited. */
export type DownloadQuota = { known: false } | { known: true; limit: number | null };

export type ActivityItem = {
  id: string;
  albumId: string;
  albumTitle: string;
  clientLabel: string;
  /** Normalized retouching note, or null when the client selected without one. */
  note: string | null;
  thumbUrl: string | null;
  createdAt: string;
};

export type AlbumOverview = {
  id: string;
  title: string;
  clientLabel: string;
  status: AlbumStatus;
  photoCount: number | null;
  storageBytes: number | null;
  storagePartial: boolean;
  selectionCount: number | null;
  notesCount: number | null;
  quota: DownloadQuota;
};

export type DashboardModel = {
  albumCounts: { total: number; published: number; draft: number; archived: number } | null;
  photoCounts: {
    total: number;
    uploading: number;
    processing: number;
    failed: number;
  } | null;
  selectionCount: number | null;
  notesCount: number | null;
  activity: ActivityItem[] | null;
  albums: AlbumOverview[] | null;
  albumTotal: number | null;
  storageBytes: number | null;
  storagePartial: boolean;
  stuckPhotoIds: string[];
  warning: string | null;
};

export type ReviewAlbumSummary = {
  id: string;
  title: string;
  slug: string;
  shootDateLabel: string | null;
  clientLabel: string;
  status: AlbumStatus;
  photoCount: number;
  selectionCount: number;
  notedPhotoCount: number;
  quota: DownloadQuota;
};

export type ReviewPhoto = {
  id: string;
  filename: string;
  thumbUrl: string | null;
  proofUrl: string | null;
  status: PhotoStatus;
  selected: boolean;
  notes: string | null;
  selectedAt: string | null;
  clientLabel: string | null;
  selectionId: string | null;
  retouchStatus: RetouchStatus | null;
  adminReply: string | null;
  adminRepliedAt: string | null;
};

export type SelectionReview = {
  album: ReviewAlbumSummary;
  photos: ReviewPhoto[];
};

export function formatSelectionQuota(count: number, quota: DownloadQuota): string {
  if (!quota.known) return `${count} selected`;
  if (quota.limit === null) return `${count} selected · Unlimited`;
  return `${count} / ${quota.limit} selected`;
}

export function formatClientLabel(
  profile: { full_name: string | null; email: string | null } | null | undefined,
  fallbackEmail?: string | null,
  emptyLabel = "No client",
): string {
  const name = profile?.full_name?.trim() ?? "";
  const email = profile?.email?.trim() || fallbackEmail?.trim() || "";
  if (name && email && name.toLowerCase() !== email.toLowerCase()) {
    return `${name} · ${email}`;
  }
  return name || email || emptyLabel;
}

export function noteText(notes: string | null | undefined): string | null {
  return normalizeNote(notes);
}
