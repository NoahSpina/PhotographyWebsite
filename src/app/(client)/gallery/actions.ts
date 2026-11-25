"use server";

import {
  countSelections,
  getAlbumEntitlement,
  type AlbumEntitlement,
} from "@/lib/entitlements";
import { getGalleryAccess, type GalleryAccess } from "@/lib/gallery/access";
import {
  NOTE_MAX_LENGTH,
  normalizeNote,
  type QuotaExceeded,
  type SaveSelectionNoteInput,
  type SaveSelectionNoteResult,
  type SelectionError,
  type SelectionErrorCode,
  type ToggleSelectionInput,
  type ToggleSelectionResult,
} from "@/lib/gallery/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation";

/**
 * Selects or deselects one photo for the album's client. Admins act on the
 * client's behalf. Selecting is idempotent and refused with QUOTA_EXCEEDED
 * once the client's download limit is reached.
 */
export async function toggleSelection(
  input: ToggleSelectionInput,
): Promise<ToggleSelectionResult> {
  const parsed = parseToggleInput(input);
  if ("error" in parsed) return selectionError("INVALID_INPUT", parsed.error);

  const access = await getGalleryAccess(parsed.albumId);
  if (!access.ok) return accessError(access.reason);

  const { supabase, album } = access;
  const clientId = album.client_id;
  if (!clientId) {
    return selectionError("NO_CLIENT", "Assign a client to this album before selecting photos.");
  }

  const key = { album_id: album.id, photo_id: parsed.photoId, client_id: clientId };

  try {
    if (!parsed.selected) {
      const { error } = await supabase.from("selections").delete().match(key);
      if (error) throw new Error(`Delete failed: ${error.message}`);
      const entitlement = await getAlbumEntitlement(supabase, album, clientId);
      return selectionResult(parsed.photoId, false, null, entitlement);
    }

    const [photoResult, existingResult, entitlement] = await Promise.all([
      supabase
        .from("photos")
        .select("id")
        .eq("id", parsed.photoId)
        .eq("album_id", album.id)
        .eq("status", "ready")
        .maybeSingle(),
      supabase.from("selections").select("notes").match(key).maybeSingle(),
      getAlbumEntitlement(supabase, album, clientId),
    ]);

    if (photoResult.error) throw new Error(`Photo lookup failed: ${photoResult.error.message}`);
    if (existingResult.error) {
      throw new Error(`Selection lookup failed: ${existingResult.error.message}`);
    }
    if (!photoResult.data) {
      return selectionError("NOT_FOUND", "That photo is not in this gallery.");
    }
    if (existingResult.data) {
      return selectionResult(parsed.photoId, true, existingResult.data.notes, entitlement);
    }

    const limit = entitlement.downloadLimit;
    if (limit !== null && entitlement.selectionCount >= limit) {
      return quotaExceeded(limit, entitlement.selectionCount);
    }

    // Clients have no insert policy (see 0002_client_proofing.sql), so the
    // quota above cannot be bypassed through the Data API. Every value here
    // was verified with the caller's RLS-bound client.
    const admin = createAdminClient();
    const { data: inserted, error: insertError } = await admin
      .from("selections")
      .insert({ ...key, notes: parsed.notes })
      .select("id, notes")
      .single();

    if (insertError?.code === "23505") {
      const { data: current } = await supabase
        .from("selections")
        .select("notes")
        .match(key)
        .maybeSingle();
      const refreshed = await getAlbumEntitlement(supabase, album, clientId);
      return selectionResult(parsed.photoId, true, current?.notes ?? null, refreshed);
    }
    if (insertError || !inserted) {
      throw new Error(`Insert failed: ${insertError?.message ?? "no row returned"}`);
    }

    if (limit === null) {
      return selectionResult(parsed.photoId, true, inserted.notes, {
        ...entitlement,
        selectionCount: entitlement.selectionCount + 1,
      });
    }

    // Concurrent requests can all pass the check above. Recounting after the
    // insert and backing out an over-limit row keeps the stored count within
    // the limit: at worst both racing requests are refused.
    const count = await countSelections(supabase, album.id, clientId);
    if (count > limit) {
      const { error: rollbackError } = await admin
        .from("selections")
        .delete()
        .eq("id", inserted.id);
      if (rollbackError) {
        console.error("Could not back out an over-limit selection:", rollbackError.message);
      }
      return quotaExceeded(limit, count - 1);
    }

    return {
      ok: true,
      photoId: parsed.photoId,
      selected: true,
      notes: inserted.notes,
      selectionCount: count,
      downloadLimit: limit,
      downloadsUnlocked: entitlement.downloadsUnlocked,
    };
  } catch (error) {
    console.error(
      "Could not update the selection:",
      error instanceof Error ? error.message : error,
    );
    return selectionError("SERVER_ERROR", "Your selection could not be saved. Try again.");
  }
}

/** Sets or clears the retouching note on a photo the client has selected. */
export async function saveSelectionNote(
  input: SaveSelectionNoteInput,
): Promise<SaveSelectionNoteResult> {
  const parsed = parseNoteInput(input);
  if ("error" in parsed) return selectionError("INVALID_INPUT", parsed.error);

  const access = await getGalleryAccess(parsed.albumId);
  if (!access.ok) return accessError(access.reason);

  const { supabase, album } = access;
  const clientId = album.client_id;
  if (!clientId) {
    return selectionError("NO_CLIENT", "Assign a client to this album before adding notes.");
  }

  const key = { album_id: album.id, photo_id: parsed.photoId, client_id: clientId };

  const { data, error } = await supabase
    .from("selections")
    .update({ notes: parsed.notes })
    .match(key)
    .select("notes")
    .maybeSingle();

  if (error) {
    console.error("Could not save the selection note:", error.message);
    return selectionError("SERVER_ERROR", "Your note could not be saved. Try again.");
  }

  if (!data) {
    // RLS turns a missing update policy into zero updated rows, which would
    // otherwise look the same as "not selected".
    const { data: existing } = await supabase
      .from("selections")
      .select("id")
      .match(key)
      .maybeSingle();
    if (existing) {
      console.error(
        "Selection note update matched no rows. Check that supabase/migrations/0002_client_proofing.sql has been run.",
      );
      return selectionError("SERVER_ERROR", "Your note could not be saved. Try again.");
    }
    return selectionError("NOT_FOUND", "Select this photo before adding a note.");
  }

  return { ok: true, photoId: parsed.photoId, notes: data.notes };
}

type ParsedToggle = {
  albumId: string;
  photoId: string;
  selected: boolean;
  notes: string | null;
};

function parseToggleInput(input: unknown): ParsedToggle | { error: string } {
  if (typeof input !== "object" || input === null) return { error: "Invalid request." };
  const { albumId, photoId, selected, notes } = input as Record<string, unknown>;

  if (!isUuid(albumId) || !isUuid(photoId)) return { error: "Unknown photo." };
  if (typeof selected !== "boolean") return { error: "selected must be true or false." };

  const parsedNotes = parseNotes(notes);
  if ("error" in parsedNotes) return parsedNotes;

  return { albumId, photoId, selected, notes: parsedNotes.notes };
}

function parseNoteInput(
  input: unknown,
): { albumId: string; photoId: string; notes: string | null } | { error: string } {
  if (typeof input !== "object" || input === null) return { error: "Invalid request." };
  const { albumId, photoId, notes } = input as Record<string, unknown>;

  if (!isUuid(albumId) || !isUuid(photoId)) return { error: "Unknown photo." };

  const parsedNotes = parseNotes(notes);
  if ("error" in parsedNotes) return parsedNotes;

  return { albumId, photoId, notes: parsedNotes.notes };
}

function parseNotes(value: unknown): { notes: string | null } | { error: string } {
  if (value === undefined || value === null) return { notes: null };
  if (typeof value !== "string") return { error: "Notes must be text." };

  const notes = normalizeNote(value);
  if (notes && notes.length > NOTE_MAX_LENGTH) {
    return { error: `Keep notes under ${NOTE_MAX_LENGTH.toLocaleString("en-US")} characters.` };
  }
  return { notes };
}

function selectionResult(
  photoId: string,
  selected: boolean,
  notes: string | null,
  entitlement: AlbumEntitlement,
): ToggleSelectionResult {
  return {
    ok: true,
    photoId,
    selected,
    notes,
    selectionCount: entitlement.selectionCount,
    downloadLimit: entitlement.downloadLimit,
    downloadsUnlocked: entitlement.downloadsUnlocked,
  };
}

function quotaExceeded(limit: number, current: number): QuotaExceeded {
  return { ok: false, code: "QUOTA_EXCEEDED", limit, current };
}

function selectionError(code: SelectionErrorCode, message: string): SelectionError {
  return { ok: false, code, message };
}

function accessError(
  reason: Extract<GalleryAccess, { ok: false }>["reason"],
): SelectionError {
  if (reason === "unauthenticated") {
    return selectionError("UNAUTHENTICATED", "Your session expired. Sign in again to keep selecting.");
  }
  if (reason === "not_found") {
    return selectionError("NOT_FOUND", "This gallery is not available.");
  }
  return selectionError("SERVER_ERROR", "The gallery could not be reached. Try again.");
}
