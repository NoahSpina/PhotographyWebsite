import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type GeneratedMagicLink = {
  url: string;
  userId: string;
};

/**
 * Builds a sign-in link without sending email, for local testing without
 * SMTP and for sharing a link manually. generateLink creates the auth user
 * (and, via trigger, the profile) when the email is new.
 *
 * The URL is a live credential for that user. Never log it.
 */
export async function generateMagicLink(input: {
  email: string;
  origin: string;
  next: string;
}): Promise<GeneratedMagicLink | { error: string }> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: input.email,
  });

  if (error || !data.properties?.hashed_token || !data.user) {
    return { error: error?.message ?? "Supabase did not return a sign-in token." };
  }

  // type=email verifies both magic link and first-time signup tokens.
  const url = new URL("/auth/confirm", input.origin);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "email");
  url.searchParams.set("next", input.next);

  return { url: url.toString(), userId: data.user.id };
}
