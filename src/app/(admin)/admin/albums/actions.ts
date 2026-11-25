"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  sendsMagicLinkEmails,
  type AlbumField,
  type AlbumFormState,
  type MagicLinkDelivery,
  type PublishAlbumState,
} from "@/lib/admin/album-actions-state";
import { verifyAdmin } from "@/lib/auth/admin";
import { generateMagicLink } from "@/lib/auth/magic-link";
import { publicEnv } from "@/lib/env";
import { createSessionlessClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import { isEmail, isUuid } from "@/lib/validation";
import type { AlbumStatus } from "@/types";

const ALBUM_STATUSES: readonly AlbumStatus[] = ["draft", "published", "archived"];

type AlbumInput = {
  title: string;
  shoot_date: string | null;
  client_email: string | null;
  assigned_package_id: string | null;
  status: AlbumStatus;
  is_public_portfolio: boolean;
};

export async function saveAlbum(
  _previous: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const admin = await verifyAdmin();
  if (!admin.ok) {
    return { status: "error", message: "Admin access required.", fieldErrors: {} };
  }

  const albumId = stringField(formData, "albumId");
  if (albumId && !isUuid(albumId)) {
    return { status: "error", message: "Unknown album.", fieldErrors: {} };
  }

  const parsed = parseAlbumInput(formData);
  if ("fieldErrors" in parsed) {
    return { status: "error", message: "Fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const { supabase } = admin;
  const clientId = parsed.client_email
    ? await findProfileIdByEmail(supabase, parsed.client_email)
    : null;

  if (!albumId) {
    const { data, error } = await supabase
      .from("albums")
      .insert({ ...parsed, client_id: clientId, slug: albumSlug(parsed.title) })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Could not create album:", error?.message);
      return { status: "error", message: albumErrorMessage(error?.code), fieldErrors: {} };
    }

    redirect(`/admin/albums/${data.id}`);
  }

  const { data, error } = await supabase
    .from("albums")
    .update({ ...parsed, client_id: clientId })
    .eq("id", albumId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Could not update album:", error.message);
    return {
      status: "error",
      message: error ? albumErrorMessage(error.code) : "Album not found.",
      fieldErrors: {},
    };
  }

  refresh();
  return { status: "success", message: "Album saved.", fieldErrors: {} };
}

/**
 * Publishes the album and gives the client a sign-in link that lands on
 * their gallery. Production emails the link. Development, or an explicit
 * "link" delivery from the Copy Magic Link button, returns the link
 * instead so it can be tested or shared without SMTP.
 */
export async function publishAlbumAndSendLink(
  _previous: PublishAlbumState,
  formData: FormData,
): Promise<PublishAlbumState> {
  const admin = await verifyAdmin();
  if (!admin.ok) {
    return publishError("Admin access required.");
  }

  const albumId = stringField(formData, "albumId");
  if (!isUuid(albumId)) {
    return publishError("Unknown album.");
  }

  const delivery: MagicLinkDelivery =
    stringField(formData, "delivery") === "link" || !sendsMagicLinkEmails() ? "link" : "email";

  const { supabase } = admin;
  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id, client_email, status")
    .eq("id", albumId)
    .maybeSingle();

  if (albumError || !album) {
    if (albumError) console.error("Publish could not read the album:", albumError.message);
    return publishError("Album not found.");
  }
  if (!album.client_email) {
    return publishError("Save a client email on the album first.");
  }

  const origin = publicEnv.appUrl ?? (await headers()).get("origin");
  if (!origin) {
    return publishError("Set NEXT_PUBLIC_APP_URL so the sign-in link has a host.");
  }

  const galleryPath = `/gallery/${album.id}`;
  let clientId: string | null;
  let magicLink: string | null = null;

  if (delivery === "link") {
    const generated = await generateMagicLink({
      email: album.client_email,
      origin,
      next: galleryPath,
    });
    if ("error" in generated) {
      console.error("Publish could not generate the magic link:", generated.error);
      return publishError(`The link could not be generated: ${generated.error}`);
    }
    clientId = generated.userId;
    magicLink = generated.url;
  } else {
    // signInWithOtp creates the auth user (and, via trigger, the profile)
    // on first send, so the album can be linked to that profile after.
    const { error: otpError } = await createSessionlessClient().auth.signInWithOtp({
      email: album.client_email,
      options: {
        emailRedirectTo: new URL(galleryPath, origin).toString(),
        shouldCreateUser: true,
      },
    });

    if (otpError) {
      console.error("Publish could not send the magic link:", otpError.message);
      return publishError(`The email could not be sent: ${otpError.message}`);
    }

    clientId = await findProfileIdByEmail(supabase, album.client_email);
    if (!clientId) {
      return publishError(
        "The link was sent, but the client account was not found. Try again in a moment.",
      );
    }
  }

  const { error: updateError } = await supabase
    .from("albums")
    .update({ status: "published", client_id: clientId })
    .eq("id", album.id);

  if (updateError) {
    console.error("Publish could not update the album:", updateError.message);
    return publishError("The album could not be published.");
  }

  refresh();

  const prefix = album.status === "published" ? "" : "Published. ";
  return {
    status: "success",
    message:
      delivery === "link"
        ? `${prefix}Magic link for ${album.client_email} is ready below.`
        : `${prefix}Magic link sent to ${album.client_email}.`,
    magicLink,
  };
}

function publishError(message: string): PublishAlbumState {
  return { status: "error", message, magicLink: null };
}

/**
 * Removes the row for an upload that never reached S3. Rows past
 * `uploading` have a master object, so they are left alone.
 */
export async function discardPendingUpload(photoId: string): Promise<{ ok: boolean }> {
  const admin = await verifyAdmin();
  if (!admin.ok || !isUuid(photoId)) {
    return { ok: false };
  }

  const { error } = await admin.supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("status", "uploading");

  if (error) {
    console.error("Could not discard the pending upload:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

function parseAlbumInput(
  formData: FormData,
): AlbumInput | { fieldErrors: Partial<Record<AlbumField, string>> } {
  const fieldErrors: Partial<Record<AlbumField, string>> = {};

  const title = stringField(formData, "title");
  if (!title) fieldErrors.title = "Title is required.";
  else if (title.length > 200) fieldErrors.title = "Keep the title under 200 characters.";

  const shootDate = stringField(formData, "shootDate") || null;
  if (shootDate && !isIsoDate(shootDate)) fieldErrors.shootDate = "Use a valid date.";

  const clientEmail = stringField(formData, "clientEmail").toLowerCase() || null;
  if (clientEmail && !isEmail(clientEmail)) fieldErrors.clientEmail = "Enter a valid email address.";

  const packageId = stringField(formData, "packageId") || null;
  if (packageId && !isUuid(packageId)) fieldErrors.packageId = "Choose a package from the list.";

  const status = stringField(formData, "status") as AlbumStatus;
  if (!ALBUM_STATUSES.includes(status)) fieldErrors.status = "Choose a status.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    title,
    shoot_date: shootDate,
    client_email: clientEmail,
    assigned_package_id: packageId,
    status,
    is_public_portfolio: formData.get("isPublicPortfolio") === "on",
  };
}

async function findProfileIdByEmail(
  supabase: ServerSupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Could not look up the client profile:", error.message);
  }
  return data?.id ?? null;
}

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function albumSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const suffix = crypto.randomUUID().slice(0, 6);
  return base ? `${base}-${suffix}` : `album-${suffix}`;
}

function albumErrorMessage(code: string | undefined): string {
  if (code === "23503") return "The selected package no longer exists.";
  if (code === "23505") return "An album with that slug already exists. Try saving again.";
  return "The album could not be saved.";
}
