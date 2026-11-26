"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { Timestamp } from "@/components/admin/timestamp";
import { useModalDialog } from "@/components/gallery/use-modal-dialog";
import { SelectionPhotoControls } from "@/components/admin/selection-photo-controls";
import type { ReviewPhoto } from "@/lib/admin/review";

type SelectionLightboxProps = {
  photos: ReviewPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onPhotoChange: (photoId: string, patch: Partial<ReviewPhoto>) => void;
  onPhotoRemove: (photoId: string) => void;
};

export function SelectionLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  onPhotoChange,
  onPhotoRemove,
}: SelectionLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { close, dialogProps } = useModalDialog(dialogRef, onClose);
  const photo = photos[index];
  const hasPrevious = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    for (const neighbor of [photos[index - 1], photos[index + 1]]) {
      if (neighbor?.proofUrl) new window.Image().src = neighbor.proofUrl;
    }
  }, [photos, index]);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (isTextEntry(event.target)) return;
    if (event.key === "ArrowLeft" && hasPrevious) {
      event.preventDefault();
      onIndexChange(index - 1);
    } else if (event.key === "ArrowRight" && hasNext) {
      event.preventDefault();
      onIndexChange(index + 1);
    }
  }

  if (!photo) return null;

  return (
    <dialog
      ref={dialogRef}
      {...dialogProps}
      onKeyDown={handleKeyDown}
      aria-label="Photo proof"
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-charcoal p-0 text-alabaster backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="text-sm tabular-nums text-alabaster/70">
            {index + 1} / {photos.length}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close viewer"
            className="flex size-10 items-center justify-center text-alabaster/70 transition-colors duration-500 hover:text-alabaster"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.25} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-64 flex-1">
            {photo.proofUrl ? (
              <Image
                key={photo.proofUrl}
                src={photo.proofUrl}
                alt={photo.filename}
                fill
                unoptimized
                sizes="100vw"
                className="object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-sm text-alabaster/60">
                {placeholder(photo)}
              </div>
            )}
            <NavButton
              direction="previous"
              disabled={!hasPrevious}
              onClick={() => onIndexChange(index - 1)}
            />
            <NavButton
              direction="next"
              disabled={!hasNext}
              onClick={() => onIndexChange(index + 1)}
            />
          </div>

          <aside className="flex max-h-[40vh] w-full flex-col gap-4 overflow-y-auto border-t border-alabaster/10 px-5 py-5 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l">
            <p className="sr-only" aria-live="polite">
              {photo.filename}.{" "}
              {photo.notes
                ? `Retouching note: ${photo.notes}`
                : photo.selected
                  ? "Selected without note."
                  : "Not selected."}
            </p>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-alabaster/50">
                Filename
              </p>
              <p className="mt-1 break-all text-sm">{photo.filename}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {photo.selected ? (
                <span className="bg-alabaster px-2 py-0.5 font-medium uppercase tracking-[0.14em] text-ink">
                  Selected
                </span>
              ) : (
                <span className="text-alabaster/60">Not selected</span>
              )}
              {photo.selectedAt ? (
                <Timestamp iso={photo.selectedAt} className="text-alabaster/70" />
              ) : null}
            </div>
            {photo.clientLabel ? (
              <p className="text-sm text-alabaster/70">{photo.clientLabel}</p>
            ) : null}
            {photo.notes ? (
              <div className="bg-linen px-4 py-3 text-ink">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-clay">
                  Retouching note
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {photo.notes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-alabaster/60">
                {photo.selected ? "Selected without note" : "No retouching note"}
              </p>
            )}
            <SelectionPhotoControls
              key={photo.id}
              photo={photo}
              onPhotoChange={(patch) => onPhotoChange(photo.id, patch)}
              onPhotoRemove={() => {
                onPhotoRemove(photo.id);
                close();
              }}
            />
          </aside>
        </div>
      </div>
    </dialog>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const previous = direction === "previous";
  const Icon = previous ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={previous ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center border border-alabaster/20 bg-charcoal/50 text-alabaster transition-colors duration-500 enabled:hover:border-alabaster/70 disabled:opacity-30 ${
        previous ? "left-3" : "right-3"
      }`}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.25} />
    </button>
  );
}

function placeholder(photo: ReviewPhoto): string {
  if (photo.status === "failed") return "Processing failed";
  if (photo.status === "ready") return "Preview unavailable";
  return "Waiting for proof";
}

function isTextEntry(target: EventTarget): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement
  );
}
