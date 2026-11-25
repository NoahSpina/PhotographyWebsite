export type AlbumField =
  | "title"
  | "shootDate"
  | "clientEmail"
  | "packageId"
  | "status";

export type AlbumFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<AlbumField, string>>;
};

export const initialAlbumFormState: AlbumFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

export type MagicLinkDelivery = "email" | "link";

/**
 * Magic link emails need custom SMTP, so they are only sent from
 * production builds. Elsewhere the action returns a copyable link.
 */
export function sendsMagicLinkEmails(): boolean {
  return process.env.NODE_ENV === "production";
}

export type PublishAlbumState = {
  status: "idle" | "success" | "error";
  message: string | null;
  magicLink: string | null;
};

export const initialPublishAlbumState: PublishAlbumState = {
  status: "idle",
  message: null,
  magicLink: null,
};
