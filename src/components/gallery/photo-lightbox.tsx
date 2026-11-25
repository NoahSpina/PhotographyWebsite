import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { HeartIcon } from "@/components/gallery/heart-icon";
import { ProtectedImage } from "@/components/gallery/protected-image";
import { useModalDialog } from "@/components/gallery/use-modal-dialog";
import { NOTE_MAX_LENGTH, normalizeNote, type GalleryPhoto } from "@/lib/gallery/types";

type PhotoLightboxProps = {
  photos: GalleryPhoto[];
  index: number;
  selections: ReadonlyMap<string, string | null>;
  pendingIds: ReadonlySet<string>;
  canSelect: boolean;
  counterLabel: string | null;
  errorMessage: string | null;
  onIndexChange: (index: number) => void;
  onToggle: (photoId: string) => void;
  /** Resolves to an error message, or null once saved. */
  onSaveNote: (photoId: string, note: string) => Promise<string | null>;
  onClose: () => void;
};

/**
 * Full-screen proof viewer. A native modal dialog provides the focus trap,
 * Esc to close, and stacking under the upsell dialog.
 */
export function PhotoLightbox({
  photos,
  index,
  selections,
  pendingIds,
  canSelect,
  counterLabel,
  errorMessage,
  onIndexChange,
  onToggle,
  onSaveNote,
  onClose,
}: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { close, dialogProps } = useModalDialog(dialogRef, onClose);
  const photo = photos[index];
  const hasPrevious = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    for (const neighbor of [photos[index - 1], photos[index + 1]]) {
      if (neighbor) new window.Image().src = neighbor.proofUrl;
    }
  }, [photos, index]);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
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

  const selected = selections.has(photo.id);
  const pending = pendingIds.has(photo.id);

  return (
    <dialog
      ref={dialogRef}
      {...dialogProps}
      onKeyDown={handleKeyDown}
      aria-label="Photo viewer"
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-neutral-950 p-0 text-neutral-100 backdrop:bg-black/90"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="text-neutral-300">
              {index + 1} / {photos.length}
            </p>
            {counterLabel ? <p className="truncate text-neutral-500">{counterLabel}</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(photo.id)}
              disabled={!canSelect || pending}
              aria-pressed={selected}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                selected
                  ? "bg-rose-600 text-white enabled:hover:bg-rose-700"
                  : "bg-white/10 text-white enabled:hover:bg-white/20"
              }`}
            >
              <HeartIcon filled={selected} className="size-4" />
              {selected ? "Selected" : "Select"}
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close viewer"
              className="flex size-9 items-center justify-center rounded-full text-xl leading-none text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-y-0 inset-x-2 sm:inset-x-16">
            <ProtectedImage
              key={photo.id}
              src={photo.proofUrl}
              alt={`Photo ${index + 1} of ${photos.length}`}
              sizes="100vw"
              fit="contain"
              eager
              className="h-full w-full"
            />
          </div>
          <NavButton
            direction="previous"
            disabled={!hasPrevious}
            onClick={() => onIndexChange(index - 1)}
          />
          <NavButton direction="next" disabled={!hasNext} onClick={() => onIndexChange(index + 1)} />
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          {errorMessage ? (
            <p role="alert" className="mb-2 text-sm text-red-400">
              {errorMessage}
            </p>
          ) : null}
          {!canSelect ? null : selected ? (
            <NoteEditor
              key={photo.id}
              photoId={photo.id}
              savedNote={selections.get(photo.id) ?? null}
              onSave={onSaveNote}
            />
          ) : (
            <p className="text-sm text-neutral-500">
              Select this photo to leave a retouching note.
            </p>
          )}
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
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrevious ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl text-white enabled:hover:bg-black/70 disabled:opacity-25 ${
        isPrevious ? "left-2 sm:left-3" : "right-2 sm:right-3"
      }`}
    >
      {isPrevious ? "‹" : "›"}
    </button>
  );
}

type NoteStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved" }
  | { state: "error"; message: string };

function NoteEditor({
  photoId,
  savedNote,
  onSave,
}: {
  photoId: string;
  savedNote: string | null;
  onSave: (photoId: string, note: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(savedNote ?? "");
  const [status, setStatus] = useState<NoteStatus>({ state: "idle" });
  const inFlight = useRef<string | null>(null);
  const dirty = normalizeNote(draft) !== savedNote;
  const fieldId = `note-${photoId}`;

  async function save() {
    const value = normalizeNote(draft) ?? "";
    if (!dirty || inFlight.current === value) return;

    inFlight.current = value;
    setStatus({ state: "saving" });
    const error = await onSave(photoId, value);
    inFlight.current = null;
    setStatus(error ? { state: "error", message: error } : { state: "saved" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Esc leaves the field (saving on blur) instead of closing the viewer.
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void save();
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-neutral-200">
        Retouching note <span className="font-normal text-neutral-500">(optional)</span>
      </label>
      <textarea
        id={fieldId}
        value={draft}
        rows={2}
        maxLength={NOTE_MAX_LENGTH}
        placeholder="For example: soften the shadows, remove the stray hair"
        onChange={(event) => {
          setDraft(event.target.value);
          if (status.state !== "saving") setStatus({ state: "idle" });
        }}
        onBlur={() => void save()}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-neutral-400"
      />
      <div className="flex items-center justify-between gap-3 text-xs">
        <p
          role={status.state === "error" ? "alert" : "status"}
          className={status.state === "error" ? "text-red-400" : "text-neutral-500"}
        >
          {status.state === "saving"
            ? "Saving…"
            : status.state === "saved" && !dirty
              ? "Note saved."
              : status.state === "error"
                ? status.message
                : dirty
                  ? "Unsaved changes. Leaving the field saves them."
                  : ""}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || status.state === "saving"}
          className="rounded-md border border-neutral-700 px-3 py-1 text-neutral-200 enabled:hover:border-neutral-400 disabled:opacity-50"
        >
          Save note
        </button>
      </div>
    </div>
  );
}

function isTextEntry(target: EventTarget): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement
  );
}
