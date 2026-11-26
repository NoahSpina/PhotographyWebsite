"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { PhotoStatusBadge } from "@/components/admin/status-badge";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { SelectionPhotoControls } from "@/components/admin/selection-photo-controls";
import { buttonClass } from "@/components/ui/button-styles";
import { ALBUM_PHOTO_COLUMNS, type AlbumPhoto } from "@/lib/admin/photos";
import type { ReviewPhoto } from "@/lib/admin/review";
import { proofUrl } from "@/lib/aws/cloudfront";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 3000;

type AlbumPhotosProps = {
  albumId: string;
  initialPhotos: AlbumPhoto[];
  selectedPhotoIds: string[];
};

export function AlbumPhotos({ albumId, initialPhotos, selectedPhotoIds }: AlbumPhotosProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [pollError, setPollError] = useState<string | null>(null);
  const [trackedIds, setTrackedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedPhotoIds), [selectedPhotoIds]);

  const shouldPoll = photos.some(
    (photo) =>
      photo.status === "processing" ||
      (photo.status === "uploading" && trackedIds.has(photo.id)),
  );

  useEffect(() => {
    if (!shouldPoll) return;

    const supabase = createClient();
    let cancelled = false;

    const interval = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("photos")
        .select(ALBUM_PHOTO_COLUMNS)
        .eq("album_id", albumId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error) {
        setPollError("Could not refresh photo status. Retrying…");
        return;
      }
      setPollError(null);
      setPhotos(data);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [shouldPoll, albumId]);

  function handlePhotoCreated(photoId: string) {
    setTrackedIds((current) => new Set(current).add(photoId));
    setPhotos((current) =>
      current.some((photo) => photo.id === photoId)
        ? current
        : [
            ...current,
            {
              id: photoId,
              status: "uploading",
              thumb_s3_key: null,
              proof_s3_key: null,
              width: null,
              height: null,
              created_at: new Date().toISOString(),
            },
          ],
    );
  }

  function handleUploadSettled(photoId: string, outcome: "uploaded" | "failed") {
    if (outcome === "failed") {
      setTrackedIds((current) => {
        const next = new Set(current);
        next.delete(photoId);
        return next;
      });
      setPhotos((current) =>
        current.filter((photo) => !(photo.id === photoId && photo.status === "uploading")),
      );
    }
  }

  function patchPhoto(photoId: string, patch: Partial<ReviewPhoto>) {
    if (patch.status) {
      setPhotos((current) =>
        current.map((photo) =>
          photo.id === photoId ? { ...photo, status: patch.status! } : photo,
        ),
      );
      if (patch.status === "uploading") {
        setTrackedIds((current) => new Set(current).add(photoId));
      }
    }
    if (
      patch.status === "ready" ||
      patch.status === "failed" ||
      patch.thumbUrl !== undefined ||
      patch.proofUrl !== undefined
    ) {
      void refreshPhotos();
    }
  }

  async function refreshPhotos() {
    const supabase = createClient();
    const { data } = await supabase
      .from("photos")
      .select(ALBUM_PHOTO_COLUMNS)
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (data) setPhotos(data);
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setCheckedIds((current) => {
      const next = new Set(current);
      next.delete(photoId);
      return next;
    });
  }

  async function deleteSelected() {
    if (checkedIds.size === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      const response = await fetch("/api/admin/photos/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [...checkedIds] }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not delete photos.";
        throw new Error(message);
      }
      const deleted = new Set(checkedIds);
      setPhotos((current) => current.filter((photo) => !deleted.has(photo.id)));
      setCheckedIds(new Set());
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Could not delete photos.");
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleChecked(photoId: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  const counts = {
    ready: photos.filter((photo) => photo.status === "ready").length,
    pending: photos.filter((photo) => photo.status === "uploading" || photo.status === "processing")
      .length,
    failed: photos.filter((photo) => photo.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <PhotoUploader
        albumId={albumId}
        onPhotoCreated={handlePhotoCreated}
        onUploadSettled={handleUploadSettled}
      />

      {checkedIds.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border border-hairline px-4 py-3">
          <span className="text-sm tabular-nums">{checkedIds.size} selected</span>
          <button
            type="button"
            onClick={() => void deleteSelected()}
            disabled={bulkBusy}
            className={buttonClass({
              variant: "outline",
              size: "sm",
              className: "border-red-800/30 text-red-900 hover:border-red-900 hover:bg-red-900 hover:text-alabaster",
            })}
          >
            {bulkBusy ? "Deleting…" : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={() => setCheckedIds(new Set())}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            Clear
          </button>
          {bulkError ? <span className="text-xs text-red-700">{bulkError}</span> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
        <span>{photos.length} photos</span>
        <span>{counts.ready} ready</span>
        {counts.pending > 0 ? <span>{counts.pending} in progress</span> : null}
        {counts.failed > 0 ? (
          <span className="text-red-700 dark:text-red-400">{counts.failed} failed</span>
        ) : null}
        {pollError ? <span className="text-amber-700 dark:text-amber-400">{pollError}</span> : null}
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-neutral-500">No photos yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              tracked={trackedIds.has(photo.id)}
              checked={checkedIds.has(photo.id)}
              clientSelected={selectedSet.has(photo.id)}
              onToggleChecked={() => toggleChecked(photo.id)}
              onPatch={(patch) => patchPhoto(photo.id, patch)}
              onRemove={() => removePhoto(photo.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  tracked,
  checked,
  clientSelected,
  onToggleChecked,
  onPatch,
  onRemove,
}: {
  photo: AlbumPhoto;
  tracked: boolean;
  checked: boolean;
  clientSelected: boolean;
  onToggleChecked: () => void;
  onPatch: (patch: Partial<ReviewPhoto>) => void;
  onRemove: () => void;
}) {
  const thumbnail = photo.status === "ready" ? thumbnailUrl(photo.thumb_s3_key) : null;
  const label =
    photo.status === "uploading" && !tracked ? "Upload incomplete" : undefined;

  const reviewPhoto: ReviewPhoto = {
    id: photo.id,
    filename: photo.id,
    thumbUrl: thumbnail,
    proofUrl: photo.proof_s3_key ? thumbnailUrl(photo.proof_s3_key) : null,
    status: photo.status,
    selected: clientSelected,
    notes: null,
    selectedAt: null,
    clientLabel: null,
    selectionId: null,
    retouchStatus: null,
    adminReply: null,
    adminRepliedAt: null,
  };

  return (
    <li className="min-w-0 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900">
        <label className="absolute top-2 left-2 z-10 flex cursor-pointer items-center gap-1 rounded bg-black/55 px-1.5 py-1 text-[10px] text-white">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleChecked}
            className="size-3 accent-white"
            aria-label={`Select photo ${photo.id} for bulk delete`}
          />
        </label>
        {thumbnail ? (
          <Image
            key={thumbnail}
            src={thumbnail}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500">
            {photo.status === "failed" ? "Processing failed" : "Waiting for proof…"}
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-2 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <PhotoStatusBadge status={photo.status} label={label} />
          {photo.width && photo.height ? (
            <span className="text-xs text-neutral-500">
              {photo.width}×{photo.height}
            </span>
          ) : null}
        </div>
        <SelectionPhotoControls
          photo={reviewPhoto}
          showRetouchFields={false}
          onPhotoChange={onPatch}
          onPhotoRemove={onRemove}
        />
      </div>
    </li>
  );
}

function thumbnailUrl(key: string | null): string | null {
  if (!key) return null;
  try {
    return proofUrl(key);
  } catch (error) {
    console.error(error);
    return null;
  }
}