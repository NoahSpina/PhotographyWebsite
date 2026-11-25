"use client";

import Link from "next/link";
import { useState } from "react";
import { saveSelectionNote, toggleSelection } from "@/app/(client)/gallery/actions";
import { GalleryTopBar, type GalleryFilter } from "@/components/gallery/gallery-top-bar";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { PhotoLightbox } from "@/components/gallery/photo-lightbox";
import { UpsellModal, type UpsellTrigger } from "@/components/gallery/upsell-modal";
import type {
  GalleryPhoto,
  GalleryQuota,
  GallerySelection,
  UpgradeOptions,
} from "@/lib/gallery/types";
import type { AlbumStatus } from "@/types";

type ProofingGalleryProps = {
  signedInName: string | null;
  album: { id: string; title: string; shootDateLabel: string | null };
  photos: GalleryPhoto[];
  initialSelections: GallerySelection[];
  /** null when the album has no client to select for (admin preview only). */
  initialQuota: GalleryQuota | null;
  upgradeOptions: UpgradeOptions;
  adminPreview: { clientEmail: string | null; status: AlbumStatus } | null;
};

type SelectionMap = ReadonlyMap<string, string | null>;

type Notice = { tone: "info" | "error"; message: string };

export function ProofingGallery({
  signedInName,
  album,
  photos,
  initialSelections,
  initialQuota,
  upgradeOptions,
  adminPreview,
}: ProofingGalleryProps) {
  const [selections, setSelections] = useState<SelectionMap>(
    () => new Map(initialSelections.map((selection) => [selection.photoId, selection.notes])),
  );
  const [quota, setQuota] = useState(initialQuota);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [lightbox, setLightbox] = useState<{ photos: GalleryPhoto[]; index: number } | null>(
    null,
  );
  const [upsell, setUpsell] = useState<UpsellTrigger | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const canSelect = quota !== null;
  const selectedCount = selections.size;
  const visiblePhotos =
    filter === "selected" ? photos.filter((photo) => selections.has(photo.id)) : photos;

  function handleToggle(photoId: string) {
    if (!quota || pendingIds.has(photoId)) return;

    const wasSelected = selections.has(photoId);
    const previousNote = selections.get(photoId) ?? null;
    const limit = quota.downloadLimit;

    if (!wasSelected && limit !== null && selections.size >= limit) {
      setUpsell({ reason: "quota", limit, current: selections.size });
      return;
    }

    const rollback = () =>
      setSelections((current) => withSelection(current, photoId, wasSelected, previousNote));

    setNotice(null);
    setSelections((current) => withSelection(current, photoId, !wasSelected, previousNote));
    setPendingIds((current) => new Set(current).add(photoId));

    toggleSelection({ albumId: album.id, photoId, selected: !wasSelected })
      .then((result) => {
        if (result.ok) {
          setSelections((current) =>
            withSelection(current, photoId, result.selected, result.notes),
          );
          setQuota({
            downloadLimit: result.downloadLimit,
            downloadsUnlocked: result.downloadsUnlocked,
          });
          return;
        }

        rollback();
        if (result.code === "QUOTA_EXCEEDED") {
          setQuota((current) => current && { ...current, downloadLimit: result.limit });
          setUpsell({ reason: "quota", limit: result.limit, current: result.current });
        } else {
          setNotice({ tone: "error", message: result.message });
        }
      })
      .catch(() => {
        rollback();
        setNotice({
          tone: "error",
          message: "Your selection could not be saved. Check your connection and try again.",
        });
      })
      .finally(() => {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(photoId);
          return next;
        });
      });
  }

  async function handleSaveNote(photoId: string, note: string): Promise<string | null> {
    try {
      const result = await saveSelectionNote({ albumId: album.id, photoId, notes: note });
      if (!result.ok) return result.message;
      setSelections((current) =>
        current.has(photoId) ? withSelection(current, photoId, true, result.notes) : current,
      );
      return null;
    } catch {
      return "Your note could not be saved. Check your connection and try again.";
    }
  }

  function handleDownloadSelected() {
    // TODO: request presigned master URLs from /api/downloads/presign once
    // high-res delivery is built. That route must re-check the entitlement.
    setNotice({
      tone: "info",
      message: "High-res downloads aren't available yet. Your selections are saved.",
    });
  }

  function openLightbox(photoId: string) {
    // Snapshot the visible list so deselecting in "Selected Only" doesn't
    // pull the open photo out from under the viewer.
    const index = visiblePhotos.findIndex((photo) => photo.id === photoId);
    if (index >= 0) setLightbox({ photos: visiblePhotos, index });
  }

  const counterLabel =
    quota === null
      ? null
      : quota.downloadLimit === null
        ? `Unlimited Gallery · ${selectedCount} selected`
        : `${selectedCount} of ${quota.downloadLimit} photos selected`;

  return (
    <div className="flex flex-1 flex-col">
      <GalleryTopBar
        signedInName={signedInName}
        title={album.title}
        shootDateLabel={album.shootDateLabel}
        photoCount={photos.length}
        selectedCount={selectedCount}
        quota={quota}
        filter={filter}
        onFilterChange={setFilter}
        onUpgrade={() => setUpsell({ reason: "manual" })}
        onDownloadSelected={handleDownloadSelected}
      />

      {adminPreview ? (
        <AdminPreviewBanner albumId={album.id} canSelect={canSelect} {...adminPreview} />
      ) : null}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {visiblePhotos.length > 0 ? (
          <PhotoGrid
            photos={visiblePhotos}
            selections={selections}
            pendingIds={pendingIds}
            canSelect={canSelect}
            onOpen={openLightbox}
            onToggle={handleToggle}
          />
        ) : (
          <EmptyState
            filter={filter}
            hasPhotos={photos.length > 0}
            onShowAll={() => setFilter("all")}
          />
        )}
      </main>

      {notice ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-lg items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg ${
              notice.tone === "error"
                ? "bg-red-700 text-white"
                : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            }`}
          >
            <p className="flex-1">{notice.message}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
              className="leading-none opacity-80 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          selections={selections}
          pendingIds={pendingIds}
          canSelect={canSelect}
          counterLabel={counterLabel}
          errorMessage={notice?.tone === "error" ? notice.message : null}
          onIndexChange={(index) => setLightbox((current) => current && { ...current, index })}
          onToggle={handleToggle}
          onSaveNote={handleSaveNote}
          onClose={() => setLightbox(null)}
        />
      ) : null}

      {upsell ? (
        <UpsellModal
          trigger={upsell}
          downloadLimit={quota?.downloadLimit ?? null}
          options={upgradeOptions}
          maxExtraPhotos={Math.max(1, photos.length - (quota?.downloadLimit ?? 0))}
          onClose={() => setUpsell(null)}
        />
      ) : null}
    </div>
  );
}

function withSelection(
  current: SelectionMap,
  photoId: string,
  selected: boolean,
  notes: string | null,
): SelectionMap {
  const next = new Map(current);
  if (selected) next.set(photoId, notes);
  else next.delete(photoId);
  return next;
}

function AdminPreviewBanner({
  albumId,
  canSelect,
  clientEmail,
  status,
}: {
  albumId: string;
  canSelect: boolean;
  clientEmail: string | null;
  status: AlbumStatus;
}) {
  const scope = canSelect
    ? `Selections and notes you make here are saved for ${clientEmail ?? "the album's client"}.`
    : "This album has no client yet, so photos can't be selected.";
  const visibility =
    status === "published" ? "" : " Clients can't open this gallery until it's published.";

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
        <p>
          <span className="font-medium">Studio preview.</span> {scope}
          {visibility}
        </p>
        <Link
          href={`/admin/albums/${albumId}`}
          className="cursor-pointer font-medium underline underline-offset-2"
        >
          Back to album settings
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  filter,
  hasPhotos,
  onShowAll,
}: {
  filter: GalleryFilter;
  hasPhotos: boolean;
  onShowAll: () => void;
}) {
  if (filter === "selected" && hasPhotos) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-lg font-medium">No photos selected yet</p>
        <p className="mt-2 text-sm text-neutral-500">
          Tap the heart on any photo to add it to your selection.
        </p>
        <button
          type="button"
          onClick={onShowAll}
          className="mt-6 rounded-md border border-neutral-300 px-4 py-2 text-sm hover:border-neutral-500 dark:border-neutral-700"
        >
          Show all photos
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-lg font-medium">Your photos are on their way</p>
      <p className="mt-2 text-sm text-neutral-500">
        The studio is still preparing this gallery. Check back soon.
      </p>
    </div>
  );
}
