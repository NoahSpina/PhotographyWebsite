"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SelectionLightbox } from "@/components/admin/selection-lightbox";
import { SelectionPhotoControls } from "@/components/admin/selection-photo-controls";
import { Timestamp } from "@/components/admin/timestamp";
import { galleryPreviewHref } from "@/lib/admin/preview-return";
import { buttonClass } from "@/components/ui/button-styles";
import type { PhotoStatus } from "@/types";
import type { ReviewPhoto } from "@/lib/admin/review";

const FILTERS = [
  { id: "selected", label: "All Selected" },
  { id: "retouching", label: "Pending Retouching" },
  { id: "notes", label: "With Notes Only" },
  { id: "all", label: "All Album Photos" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const FIELD =
  "h-10 w-full border border-neutral-300 bg-transparent px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900 sm:w-64 dark:border-neutral-700 dark:focus:border-neutral-200";

type SelectionReviewPanelProps = {
  albumId: string;
  albumSlug: string;
  photos: ReviewPhoto[];
};

export function SelectionReviewPanel({
  albumId,
  albumSlug,
  photos: initialPhotos,
}: SelectionReviewPanelProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [filter, setFilter] = useState<FilterId>("selected");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<{ state: "copied" | "failed"; at: number } | null>(
    null,
  );

  useEffect(() => {
    if (!copyNotice) return;
    const timeout = window.setTimeout(() => setCopyNotice(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyNotice]);

  const selectedPhotos = photos.filter((photo) => photo.selected);
  const counts: Record<FilterId, number> = {
    selected: selectedPhotos.length,
    retouching: photos.filter(
      (photo) => photo.selected && (photo.retouchStatus ?? "pending") === "pending",
    ).length,
    notes: photos.filter((photo) => photo.notes).length,
    all: photos.length,
  };

  function patchPhoto(photoId: string, patch: Partial<ReviewPhoto>) {
    setPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, ...patch } : photo)),
    );
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setActiveId((current) => (current === photoId ? null : current));
  }

  const query = search.trim().toLowerCase();
  const base =
    filter === "selected"
      ? selectedPhotos
      : filter === "retouching"
        ? photos.filter(
            (photo) => photo.selected && (photo.retouchStatus ?? "pending") === "pending",
          )
        : filter === "notes"
          ? photos.filter((photo) => photo.notes)
          : photos;
  const visible = query
    ? base.filter(
        (photo) =>
          photo.filename.toLowerCase().includes(query) ||
          photo.id.toLowerCase().includes(query) ||
          (photo.notes?.toLowerCase().includes(query) ?? false),
      )
    : base;
  const activeIndex = visible.findIndex((photo) => photo.id === activeId);

  async function copyFilenames() {
    try {
      await navigator.clipboard.writeText(clipboardList(selectedPhotos.map((photo) => photo.filename)));
      setCopyNotice({ state: "copied", at: Date.now() });
    } catch (error) {
      console.error("Could not copy filenames:", error);
      setCopyNotice({ state: "failed", at: Date.now() });
    }
  }

  const copyLabel =
    copyNotice?.state === "copied"
      ? "Copied!"
      : copyNotice?.state === "failed"
        ? "Copy failed"
        : "Copy Selected Filenames";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border border-hairline p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="radiogroup" aria-label="Which photos to show" className="flex flex-wrap gap-2">
            {FILTERS.map((option) => {
              const active = filter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter(option.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-500 ${
                    active
                      ? "bg-espresso text-alabaster"
                      : "border border-hairline text-neutral-600 hover:border-espresso hover:text-ink"
                  }`}
                >
                  {option.label}
                  <span className="ml-1.5 tabular-nums opacity-80">{counts[option.id]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="block">
              <span className="sr-only">Search by filename, photo ID, or note</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search filename, ID, or note"
                autoComplete="off"
                className={FIELD}
              />
            </label>
            <button
              type="button"
              onClick={() => void copyFilenames()}
              disabled={selectedPhotos.length === 0}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              {copyLabel}
            </button>
            <button
              type="button"
              onClick={() => downloadSelectionsCsv(albumSlug, selectedPhotos)}
              disabled={selectedPhotos.length === 0}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              Export Notes (CSV)
            </button>
            <span className="sr-only" aria-live="polite">
              {copyNotice?.state === "copied"
                ? "Copied selected filenames."
                : copyNotice?.state === "failed"
                  ? "Could not copy filenames."
                  : ""}
            </span>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Showing {visible.length.toLocaleString("en-US")}
          {query ? ` matching “${search.trim()}”` : ""}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptySelectionState
          albumId={albumId}
          filter={filter}
          searching={query.length > 0}
          photoCount={photos.length}
          selectionCount={selectedPhotos.length}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((photo) => {
            const dimmed = filter === "all" && !photo.selected;
            return (
              <li key={photo.id} className="border border-hairline">
                <button
                  type="button"
                  onClick={() => setActiveId(photo.id)}
                  className="block w-full text-left transition-colors duration-500 hover:opacity-95"
                  aria-label={`Open ${photo.filename}`}
                >
                  <span
                    className={`relative block aspect-square overflow-hidden bg-linen ${
                      dimmed ? "opacity-40" : ""
                    }`}
                  >
                    {photo.thumbUrl ? (
                      <Image
                        key={photo.thumbUrl}
                        src={photo.thumbUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-3 text-center text-xs text-neutral-500">
                        {proofPlaceholder(photo.status)}
                      </span>
                    )}
                    {photo.selected ? (
                      <span className="absolute top-2 left-2 bg-espresso px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-alabaster">
                        Selected
                      </span>
                    ) : null}
                  </span>
                </button>
                <div className="space-y-3 px-3 py-3">
                  <span className="block break-all text-xs text-neutral-700" title={photo.filename}>
                    {photo.filename}
                  </span>
                  {photo.selectedAt ? (
                    <Timestamp iso={photo.selectedAt} className="block text-xs text-neutral-500" />
                  ) : (
                    <span className="block text-xs text-neutral-500">Not selected</span>
                  )}
                  {photo.notes ? (
                    <span className="block border border-clay/40 bg-linen px-3 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-clay">
                        Retouching note
                      </span>
                      <span className="mt-1.5 block whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                        {photo.notes}
                      </span>
                    </span>
                  ) : null}
                  <SelectionPhotoControls
                    photo={photo}
                    onPhotoChange={(patch) => patchPhoto(photo.id, patch)}
                    onPhotoRemove={() => removePhoto(photo.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeIndex >= 0 ? (
        <SelectionLightbox
          photos={visible}
          index={activeIndex}
          onIndexChange={(index) => {
            const next = visible[index];
            if (next) setActiveId(next.id);
          }}
          onClose={() => setActiveId(null)}
          onPhotoChange={(photoId, patch) => patchPhoto(photoId, patch)}
          onPhotoRemove={removePhoto}
        />
      ) : null}
    </div>
  );
}

function EmptySelectionState({
  albumId,
  filter,
  searching,
  photoCount,
  selectionCount,
}: {
  albumId: string;
  filter: FilterId;
  searching: boolean;
  photoCount: number;
  selectionCount: number;
}) {
  if (photoCount === 0) {
    return (
      <div className="border border-hairline px-6 py-12 text-center">
        <p className="font-serif text-2xl font-light">No photos in this album yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
          Upload proofs from the album page, then come back to review what the client picks.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href={`/admin/albums/${albumId}`}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            Manage Album
          </Link>
        </div>
      </div>
    );
  }

  if (searching) {
    return (
      <p className="border border-hairline px-6 py-10 text-center text-sm text-neutral-500">
        No photos match that search.
      </p>
    );
  }

  if (filter === "retouching") {
    return (
      <p className="border border-hairline px-6 py-10 text-center text-sm text-neutral-500">
        No pending retouching requests. Selected photos still marked pending will appear here.
      </p>
    );
  }

  if (filter === "notes") {
    return (
      <p className="border border-hairline px-6 py-10 text-center text-sm text-neutral-500">
        {selectionCount === 0
          ? "No retouching notes yet. This client has not selected any photos."
          : "No retouching notes yet. Favorites without a note are under All Selected."}
      </p>
    );
  }

  return (
    <div className="border border-hairline px-6 py-12 text-center">
      <p className="font-serif text-2xl font-light">No selections yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
        This client has not favorited any photos. Preview the gallery, or switch to all album
        photos to see the full set.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={galleryPreviewHref(albumId, `/admin/albums/${albumId}/selections`)}
          className={buttonClass({ variant: "outline", size: "sm" })}
        >
          Preview Gallery
        </Link>
        <Link
          href={`/admin/albums/${albumId}`}
          className={buttonClass({ variant: "outline", size: "sm" })}
        >
          Manage Album
        </Link>
      </div>
    </div>
  );
}

function proofPlaceholder(status: PhotoStatus): string {
  if (status === "failed") return "Processing failed";
  if (status === "ready") return "Preview unavailable";
  return "Waiting for proof";
}

function clipboardList(filenames: string[]): string {
  return filenames
    .map((name) =>
      /[",\n]/.test(name) ? `"${name.replaceAll('"', '""')}"` : name,
    )
    .join(", ");
}

function downloadSelectionsCsv(slug: string, photos: ReviewPhoto[]) {
  const lines = [
    ["filename", "photo_id", "selected_at", "retouching_note"].join(","),
    ...photos.map((photo) =>
      [photo.filename, photo.id, photo.selectedAt ?? "", photo.notes ?? ""].map(csvCell).join(","),
    ),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeSlug(slug)}-selections.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

function safeSlug(slug: string): string {
  const cleaned = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "");
  return cleaned || "album";
}
