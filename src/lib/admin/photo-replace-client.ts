import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  isAllowedImageType,
} from "@/lib/uploads";

export function validateReplaceFile(file: File): string | null {
  if (!isAllowedImageType(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }
  if (file.size === 0) {
    return "This file is empty.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit. Export a print-ready JPEG instead of a RAW or TIFF.`;
  }
  return null;
}

export async function requestReplaceUpload(
  photoId: string,
  file: File,
): Promise<{ uploadUrl: string }> {
  const response = await fetch(`/api/admin/photos/${photoId}/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type,
      fileSize: file.size,
    }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `Could not start the replacement (${response.status}).`;
    throw new Error(message);
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("uploadUrl" in body && typeof body.uploadUrl === "string")
  ) {
    throw new Error("The server returned an unexpected response.");
  }
  return { uploadUrl: body.uploadUrl };
}

export async function finalizeReplaceUpload(
  photoId: string,
  options?: { selectionId?: string; markCompleted?: boolean },
): Promise<void> {
  const response = await fetch(`/api/admin/photos/${photoId}/replace/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selectionId: options?.selectionId,
      markCompleted: options?.markCompleted === true,
    }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `Could not finalize the replacement (${response.status}).`;
    throw new Error(message);
  }
}

export async function abortReplaceUpload(photoId: string): Promise<void> {
  await fetch(`/api/admin/photos/${photoId}/replace/abort`, { method: "POST" });
}

/** XMLHttpRequest PUT so upload progress can be reported. */
export function putWithProgress(
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
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.send(file);
  });
}

export const REPLACE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");