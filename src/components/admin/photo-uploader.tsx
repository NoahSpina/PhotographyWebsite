"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { discardPendingUpload } from "@/app/(admin)/admin/albums/actions";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_CONCURRENCY,
  formatBytes,
  isAllowedImageType,
  type PresignUploadResponse,
} from "@/lib/uploads";

type UploadStatus = "queued" | "preparing" | "uploading" | "uploaded" | "failed";

type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error: string | null;
  retryable: boolean;
};

type PhotoUploaderProps = {
  albumId: string;
  /** A photos row now exists for this upload. */
  onPhotoCreated: (photoId: string) => void;
  /** The upload is over (bytes landed in S3, or the row was discarded). */
  onUploadSettled: (photoId: string, outcome: "uploaded" | "failed") => void;
};

type TaskQueue = { add: (task: () => Promise<void>) => void };

function createTaskQueue(concurrency: number): TaskQueue {
  let active = 0;
  const pending: Array<() => Promise<void>> = [];

  function next() {
    while (active < concurrency && pending.length > 0) {
      const task = pending.shift();
      if (!task) return;
      active += 1;
      task()
        .catch((error: unknown) => console.error("Upload task failed:", error))
        .finally(() => {
          active -= 1;
          next();
        });
    }
  }

  return {
    add(task) {
      pending.push(task);
      next();
    },
  };
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
const ACTIVE_STATUSES: readonly UploadStatus[] = ["queued", "preparing", "uploading"];

export function PhotoUploader({ albumId, onPhotoCreated, onUploadSettled }: PhotoUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [queue] = useState(() => createTaskQueue(UPLOAD_CONCURRENCY));
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveUploads = items.some((item) => ACTIVE_STATUSES.includes(item.status));

  useEffect(() => {
    if (!hasActiveUploads) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasActiveUploads]);

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function runUpload(itemId: string, file: File) {
    updateItem(itemId, { status: "preparing", progress: 0, error: null });

    let presign: PresignUploadResponse;
    try {
      presign = await requestUploadUrl(albumId, file);
    } catch (error) {
      updateItem(itemId, { status: "failed", error: errorMessage(error), retryable: true });
      return;
    }

    onPhotoCreated(presign.photoId);
    updateItem(itemId, { status: "uploading" });

    try {
      await putWithProgress(presign.uploadUrl, file, (progress) =>
        updateItem(itemId, { progress }),
      );
    } catch (error) {
      updateItem(itemId, { status: "failed", error: errorMessage(error), retryable: true });
      await discardPendingUpload(presign.photoId).catch(() => undefined);
      onUploadSettled(presign.photoId, "failed");
      return;
    }

    updateItem(itemId, { status: "uploaded", progress: 1 });
    onUploadSettled(presign.photoId, "uploaded");
  }

  function enqueue(item: UploadItem) {
    queue.add(() => runUpload(item.id, item.file));
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const added = Array.from(fileList).map((file): UploadItem => {
      const rejection = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        status: rejection ? "failed" : "queued",
        progress: 0,
        error: rejection,
        retryable: false,
      };
    });

    setItems((current) => [...current, ...added]);
    added.filter((item) => item.status === "queued").forEach(enqueue);
  }

  function retry(item: UploadItem) {
    updateItem(item.id, { status: "queued", progress: 0, error: null });
    enqueue(item);
  }

  function clearFinished() {
    setItems((current) => current.filter((item) => ACTIVE_STATUSES.includes(item.status)));
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  const finishedCount = items.length - items.filter((item) => ACTIVE_STATUSES.includes(item.status)).length;

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photos"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900"
            : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700"
        }`}
      >
        <p className="text-sm font-medium">Drop photos here, or click to choose files</p>
        <p className="mt-1 text-xs text-neutral-500">
          JPEG, PNG, or WebP up to {formatBytes(MAX_UPLOAD_BYTES)}. Uploads go straight to
          storage, {UPLOAD_CONCURRENCY} at a time.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              {items.length - finishedCount} in progress, {finishedCount} finished
            </span>
            {finishedCount > 0 ? (
              <button
                type="button"
                onClick={clearFinished}
                className="underline transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Clear finished
              </button>
            ) : null}
          </div>
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {items.map((item) => (
              <UploadRow key={item.id} item={item} onRetry={() => retry(item)} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function UploadRow({ item, onRetry }: { item: UploadItem; onRetry: () => void }) {
  const percent = Math.round(item.progress * 100);

  return (
    <li className="space-y-1.5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="truncate" title={item.file.name}>
          {item.file.name}
        </span>
        <span className="shrink-0 text-xs text-neutral-500">
          {formatBytes(item.file.size)} · {statusLabel(item, percent)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${item.file.name} upload progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      >
        <div
          className={`h-full transition-[width] ${
            item.status === "failed"
              ? "bg-red-600"
              : item.status === "uploaded"
                ? "bg-emerald-600"
                : "bg-neutral-900 dark:bg-neutral-100"
          }`}
          style={{ width: `${item.status === "failed" ? 100 : percent}%` }}
        />
      </div>
      {item.error ? (
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-red-700 dark:text-red-400">{item.error}</span>
          {item.retryable ? (
            <button
              type="button"
              onClick={onRetry}
              aria-label={`Retry uploading ${item.file.name}`}
              className="shrink-0 underline transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function statusLabel(item: UploadItem, percent: number): string {
  switch (item.status) {
    case "queued":
      return "Waiting";
    case "preparing":
      return "Preparing";
    case "uploading":
      return `${percent}%`;
    case "uploaded":
      return "Uploaded";
    case "failed":
      return "Failed";
  }
}

function validateFile(file: File): string | null {
  if (!isAllowedImageType(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }
  if (file.size === 0) {
    return "This file is empty.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`;
  }
  return null;
}

async function requestUploadUrl(albumId: string, file: File): Promise<PresignUploadResponse> {
  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      albumId,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `Could not start the upload (${response.status}).`;
    throw new Error(message);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("photoId" in body && typeof body.photoId === "string") ||
    !("uploadUrl" in body && typeof body.uploadUrl === "string")
  ) {
    throw new Error("The server returned an unexpected response.");
  }

  return { photoId: body.photoId, uploadUrl: body.uploadUrl };
}

/** fetch() has no upload progress events, so this uses XMLHttpRequest. */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastPercent = -1;

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.floor((event.loaded / event.total) * 100);
      if (percent !== lastPercent) {
        lastPercent = percent;
        onProgress(percent / 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () =>
      reject(new Error("Network error during upload. Check the S3 bucket CORS rules."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.send(file);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Upload failed.";
}
