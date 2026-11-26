"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Timestamp } from "@/components/admin/timestamp";
import { buttonClass } from "@/components/ui/button-styles";
import { proofUrl } from "@/lib/aws/cloudfront";
import {
  REPLACE_ACCEPT,
  abortReplaceUpload,
  finalizeReplaceUpload,
  putWithProgress,
  requestReplaceUpload,
  validateReplaceFile,
} from "@/lib/admin/photo-replace-client";
import type { ReviewPhoto } from "@/lib/admin/review";
import { createClient } from "@/lib/supabase/client";
import type { PhotoStatus, RetouchStatus } from "@/types";

const RETOUCH_OPTIONS: { value: RetouchStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

const POLL_INTERVAL_MS = 3000;

type SelectionPhotoControlsProps = {
  photo: ReviewPhoto;
  onPhotoChange: (patch: Partial<ReviewPhoto>) => void;
  onPhotoRemove?: () => void;
  /** Shown in the selection review flow; hidden on the album grid. */
  showRetouchFields?: boolean;
};

export function SelectionPhotoControls({
  photo,
  onPhotoChange,
  onPhotoRemove,
  showRetouchFields = true,
}: SelectionPhotoControlsProps) {
  const compact = !showRetouchFields;
  const actionButtonClass = compact
    ? "h-auto min-h-10 w-full min-w-0 whitespace-normal px-3 py-2 leading-snug tracking-wide normal-case"
    : "";

  const [replyDraft, setReplyDraft] = useState(photo.adminReply ?? "");
  const [replyStatus, setReplyStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [markCompleted, setMarkCompleted] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const shouldPoll =
    photo.status === "uploading" || photo.status === "processing";

  useEffect(() => {
    if (!shouldPoll) return;
    const supabase = createClient();
    let cancelled = false;

    const interval = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("status, proof_s3_key, thumb_s3_key")
        .eq("id", photo.id)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const thumbUrl = data.thumb_s3_key ? safeProofUrl(data.thumb_s3_key) : null;
      const proofUrlValue = data.proof_s3_key ? safeProofUrl(data.proof_s3_key) : null;

      onPhotoChange({
        status: data.status as PhotoStatus,
        thumbUrl,
        proofUrl: proofUrlValue,
      });

      if (data.status === "ready" || data.status === "failed") {
        setReplaceProgress(null);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [shouldPoll, photo.id, onPhotoChange]);

  async function saveRetouchStatus(next: RetouchStatus) {
    if (!photo.selectionId) return;
    setStatusError(null);
    const previous = photo.retouchStatus;
    onPhotoChange({ retouchStatus: next });
    try {
      const response = await fetch(`/api/admin/selections/${photo.selectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retouchStatus: next }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not update status.";
        throw new Error(message);
      }
    } catch (error) {
      onPhotoChange({ retouchStatus: previous });
      setStatusError(error instanceof Error ? error.message : "Could not update status.");
    }
  }

  async function saveReply() {
    if (!photo.selectionId) return;
    setReplyStatus("saving");
    try {
      const response = await fetch(`/api/admin/selections/${photo.selectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyDraft.trim() || null }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not save reply.";
        throw new Error(message);
      }
      if (typeof body === "object" && body !== null) {
        onPhotoChange({
          adminReply:
            "adminReply" in body && (body.adminReply === null || typeof body.adminReply === "string")
              ? body.adminReply
              : replyDraft.trim() || null,
          adminRepliedAt:
            "adminRepliedAt" in body && typeof body.adminRepliedAt === "string"
              ? body.adminRepliedAt
              : photo.adminRepliedAt,
        });
      }
      setReplyStatus("saved");
      window.setTimeout(() => setReplyStatus("idle"), 2000);
    } catch {
      setReplyStatus("error");
    }
  }

  async function handleReplaceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const rejection = validateReplaceFile(file);
    if (rejection) {
      setReplaceError(rejection);
      return;
    }

    setReplaceError(null);
    setReplaceProgress(0);
    onPhotoChange({ status: "uploading" });

    try {
      const { uploadUrl } = await requestReplaceUpload(photo.id, file);
      await putWithProgress(uploadUrl, file, (fraction) => setReplaceProgress(fraction));
      await finalizeReplaceUpload(photo.id, {
        selectionId: photo.selectionId ?? undefined,
        markCompleted: showRetouchFields && markCompleted,
      });
      setReplaceProgress(1);
    } catch (error) {
      setReplaceError(error instanceof Error ? error.message : "Replace failed.");
      await abortReplaceUpload(photo.id).catch(() => undefined);
      onPhotoChange({ status: "ready" });
      setReplaceProgress(null);
    }
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not delete photo.";
        throw new Error(message);
      }
      setDeleteOpen(false);
      onPhotoRemove?.();
    } catch (error) {
      setReplaceError(error instanceof Error ? error.message : "Could not delete photo.");
      setDeleteBusy(false);
    }
  }

  const replyDirty = (replyDraft.trim() || null) !== (photo.adminReply?.trim() || null);

  return (
    <div className={`space-y-4 ${compact ? "min-w-0" : ""}`}>
      {showRetouchFields && photo.selected && photo.selectionId ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Retouch status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RETOUCH_OPTIONS.map((option) => {
              const active = (photo.retouchStatus ?? "pending") === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void saveRetouchStatus(option.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-500 ${
                    active
                      ? "bg-espresso text-alabaster"
                      : "border border-hairline text-neutral-600 hover:border-espresso"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {statusError ? (
            <p className="text-xs text-red-700 dark:text-red-400">{statusError}</p>
          ) : null}
        </div>
      ) : null}

      {showRetouchFields && photo.selectionId ? (
        <div className="space-y-2">
          <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Studio reply
          </label>
          <textarea
            value={replyDraft}
            onChange={(event) => {
              setReplyDraft(event.target.value);
              setReplyStatus("idle");
            }}
            rows={3}
            className="w-full border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            placeholder="Reply visible to the client in their gallery…"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveReply()}
              disabled={!replyDirty || replyStatus === "saving"}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              {replyStatus === "saving" ? "Saving…" : replyStatus === "saved" ? "Saved" : "Save reply"}
            </button>
            {photo.adminRepliedAt ? (
              <Timestamp iso={photo.adminRepliedAt} className="text-xs text-neutral-500" />
            ) : null}
          </div>
          {replyStatus === "error" ? (
            <p className="text-xs text-red-700 dark:text-red-400">Could not save reply.</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept={REPLACE_ACCEPT}
          className="sr-only"
          onChange={(event) => void handleReplaceFile(event)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={shouldPoll}
          className={buttonClass({ variant: "outline", size: "sm", className: actionButtonClass })}
        >
          {shouldPoll ? "Processing…" : compact ? "Replace" : "Replace with retouched photo"}
        </button>
        {showRetouchFields && photo.selectionId ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={markCompleted}
              onChange={(event) => setMarkCompleted(event.target.checked)}
              className="size-3.5 accent-espresso"
            />
            Mark retouching completed after upload
          </label>
        ) : null}
        {replaceProgress !== null ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full bg-espresso transition-[width]"
              style={{ width: `${Math.round(replaceProgress * 100)}%` }}
            />
          </div>
        ) : null}
        {replaceError ? <p className="text-xs text-red-700 dark:text-red-400">{replaceError}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className={buttonClass({
          variant: "outline",
          size: "sm",
          className: `border-red-800/30 text-red-900 hover:border-red-900 hover:bg-red-900 hover:text-alabaster dark:text-red-300 ${actionButtonClass}`,
        })}
      >
        {compact ? "Delete" : "Delete photo"}
      </button>

      {deleteOpen ? (
        <DeleteConfirmDialog
          title="Delete this photo?"
          message={
            photo.selected
              ? "This photo is selected by the client. Deleting it removes their favorite and any retouching note."
              : "This permanently removes the photo and its files from storage."
          }
          busy={deleteBusy}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}

function safeProofUrl(key: string): string | null {
  try {
    return proofUrl(key);
  } catch {
    return null;
  }
}

function DeleteConfirmDialog({
  title,
  message,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-photo-title"
        className="w-full max-w-md border border-hairline bg-alabaster p-5 text-ink shadow-lg"
      >
        <h2 id="delete-photo-title" className="text-lg font-medium">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={buttonClass({ variant: "outline", size: "sm" })}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={buttonClass({
              variant: "primary",
              size: "sm",
              className: "bg-red-900 hover:bg-red-950",
            })}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}