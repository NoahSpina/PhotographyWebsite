import type { Role } from "@/types";

/**
 * Accepts only same-origin relative paths. Rejects protocol-relative
 * and absolute URLs so a `next` query param cannot redirect off-site.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("://") || value.includes("\\")) return null;
  if (value.includes("\n") || value.includes("\r")) return null;
  return value;
}

export function destinationAfterSignIn(input: {
  role: Role | null;
  albumId: string | null;
  next: string | null;
}): string {
  const next = safeInternalPath(input.next);

  if (input.role === "admin") {
    if (next?.startsWith("/admin")) return next;
    return "/admin";
  }

  if (next?.startsWith("/gallery/") || next === "/gallery") return next;
  if (input.albumId) return `/gallery/${input.albumId}`;
  return "/";
}

export function loginErrorMessage(code: string | null): string | null {
  if (code === "auth") {
    return "That sign-in link is invalid or expired. Request a new one.";
  }
  if (code === "forbidden") {
    return "You need a studio admin account to open that page.";
  }
  return null;
}
