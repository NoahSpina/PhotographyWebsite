"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PhotoStatusBadge } from "@/components/admin/status-badge";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { ALBUM_PHOTO_COLUMNS, type AlbumPhoto } from "@/lib/admin/photos";
import { proofUrl } from "@/lib/aws/cloudfront";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 3000;

type AlbumPhotosProps = {
  albumId: string;
  initialPhotos: AlbumPhoto[];
};

export function AlbumPhotos({ albumId, initialPhotos }: AlbumPhotosProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [pollError, setPollError] = useState<string | null>(null);
  // Photos uploaded from this tab. Older rows stuck in `uploading` were
  // abandoned mid-upload and should not keep the poll running forever.
  const [trackedIds, setTrackedIds] = useState<ReadonlySet<string>>(() => new Set());

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
            <PhotoTile key={photo.id} photo={photo} tracked={trackedIds.has(photo.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoTile({ photo, tracked }: { photo: AlbumPhoto; tracked: boolean }) {
  const thumbnail = photo.status === "ready" ? thumbnailUrl(photo.thumb_s3_key) : null;
  const label =
    photo.status === "uploading" && !tracked ? "Upload incomplete" : undefined;

  return (
    <li className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900">
        {thumbnail ? (
          <Image
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
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <PhotoStatusBadge status={photo.status} label={label} />
        {photo.width && photo.height ? (
          <span className="text-xs text-neutral-500">
            {photo.width}×{photo.height}
          </span>
        ) : null}
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
