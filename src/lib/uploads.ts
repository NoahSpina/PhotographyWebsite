/**
 * Upload rules shared by the browser uploader and the presign route.
 * Nothing here is secret, so Client Components may import it.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const IMAGE_EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const UPLOAD_URL_TTL_SECONDS = 5 * 60;

export const UPLOAD_CONCURRENCY = 3;

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

export type PresignUploadRequest = {
  albumId: string;
  fileName: string;
  contentType: AllowedImageType;
  fileSize: number;
};

export type PresignUploadResponse = {
  photoId: string;
  uploadUrl: string;
  masterKey: string;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
