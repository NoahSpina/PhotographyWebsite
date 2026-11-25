/**
 * Environment variables for this app.
 *
 * Public values are read with static `process.env.NEXT_PUBLIC_*` access so
 * Next.js can inline them into the browser bundle. Server secrets are read
 * only inside `getServerEnv()` so client imports of `publicEnv` do not touch
 * them. AWS and Stripe stay optional until those phases are wired up.
 */

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to .env.local and restart the dev server.`,
    );
  }
  return trimmed;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

function requiredUrl(name: string, value: string | undefined): string {
  const url = required(name, value);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `Environment variable ${name} must be an absolute http(s) URL. Check the value in .env.local.`,
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `Environment variable ${name} must use http or https. Check the value in .env.local.`,
    );
  }

  return url;
}

/**
 * Supabase clients append `/rest/v1` and `/storage/v1` themselves. Accept the
 * project origin, and also the dashboard REST URL (`.../rest/v1`) by stripping
 * that suffix. Any other path is a misconfiguration.
 */
function supabaseProjectUrl(value: string | undefined): string {
  const url = requiredUrl("NEXT_PUBLIC_SUPABASE_URL", value);
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/+$/, "");

  if (path === "" || path === "/rest/v1") {
    return parsed.origin;
  }

  throw new Error(
    "Environment variable NEXT_PUBLIC_SUPABASE_URL must be the project URL (https://<project-ref>.supabase.co). Remove /rest/v1 or any other path from .env.local and restart the dev server.",
  );
}

export const publicEnv = {
  supabaseUrl: supabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  appUrl: optional(process.env.NEXT_PUBLIC_APP_URL),
  cloudfrontDomain: optional(process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN),
  stripePublishableKey: optional(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
};

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called in the browser. Server secrets are only available in Server Components, Route Handlers, and other server code.",
    );
  }

  return {
    supabaseServiceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    aws: {
      region: optional(process.env.AWS_REGION),
      accessKeyId: optional(process.env.AWS_ACCESS_KEY_ID),
      secretAccessKey: optional(process.env.AWS_SECRET_ACCESS_KEY),
      s3BucketName: optional(process.env.AWS_S3_BUCKET_NAME),
    },
    stripe: {
      secretKey: optional(process.env.STRIPE_SECRET_KEY),
      webhookSecret: optional(process.env.STRIPE_WEBHOOK_SECRET),
    },
  };
}
