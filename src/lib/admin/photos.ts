import type { Photo } from "@/types";

export type AlbumPhoto = Pick<
  Photo,
  "id" | "status" | "thumb_s3_key" | "width" | "height" | "created_at"
>;

export const ALBUM_PHOTO_COLUMNS = "id, status, thumb_s3_key, width, height, created_at";
