import type { RetouchStatus } from "@/types";

/**
 * Shapes shared by the proofing gallery's Server Components, Server Actions,
 * and Client Components. Nothing here is secret. Photos carry CloudFront
 * proof URLs only, never S3 keys.
 */

/** Matches selections_notes_length_check in the database. */
export const NOTE_MAX_LENGTH = 2000;

export type GalleryPhoto = {
  id: string;
  thumbUrl: string;
  proofUrl: string;
  width: number | null;
  height: number | null;
};

export type GallerySelection = {
  photoId: string;
  notes: string | null;
  retouchStatus: RetouchStatus;
  adminReply: string | null;
  adminRepliedAt: string | null;
};

export type GalleryQuota = {
  /** null means unlimited. */
  downloadLimit: number | null;
  downloadsUnlocked: boolean;
};

export type UpgradePackage = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  /** null means unlimited. */
  downloadLimit: number | null;
  includesPrints: boolean;
};

export type UpgradeOptions = {
  packages: UpgradePackage[];
  /** null when the current package has no per-photo add-on. */
  extraPhotoPriceCents: number | null;
};

export type UpgradeChoice =
  | { kind: "package"; packageId: string }
  | { kind: "extra_photos"; quantity: number };

export type SelectionErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "NO_CLIENT"
  | "INVALID_INPUT"
  | "SERVER_ERROR";

export type SelectionError = {
  ok: false;
  code: SelectionErrorCode;
  message: string;
};

export type QuotaExceeded = {
  ok: false;
  code: "QUOTA_EXCEEDED";
  limit: number;
  current: number;
};

export type ToggleSelectionInput = {
  albumId: string;
  photoId: string;
  selected: boolean;
  notes?: string | null;
};

export type ToggleSelectionResult =
  | ({
      ok: true;
      photoId: string;
      selected: boolean;
      notes: string | null;
      selectionCount: number;
    } & GalleryQuota)
  | QuotaExceeded
  | SelectionError;

export type SaveSelectionNoteInput = {
  albumId: string;
  photoId: string;
  notes: string | null;
};

export type SaveSelectionNoteResult =
  | { ok: true; photoId: string; notes: string | null }
  | SelectionError;

export function normalizeNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}
