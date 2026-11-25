import { publicEnv } from "@/lib/env";

const PROOF_KEY_PATTERN = /^proofs\/[A-Za-z0-9._\-/]+$/;

export function isProofKey(key: string): boolean {
  return PROOF_KEY_PATTERN.test(key) && !key.split("/").includes("..");
}

function cloudfrontHost(): string {
  const host = publicEnv.cloudfrontDomain?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!host) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDFRONT_DOMAIN is not set. Add the CloudFront hostname (no scheme) to .env.local.",
    );
  }
  return host;
}

/**
 * Public CDN URL for a watermarked proof or thumbnail. CloudFront only
 * fronts `proofs/*`, so any other key (especially `masters/`) is refused.
 */
export function proofUrl(key: string): string {
  if (!isProofKey(key)) {
    throw new Error("Only proofs/ keys can be served through CloudFront.");
  }
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `https://${cloudfrontHost()}/${path}`;
}
