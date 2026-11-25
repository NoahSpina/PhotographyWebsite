export function proofUrl(objectKey: string): string {
  const domain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN ?? "";
  return `https://${domain}/proofs/${objectKey}`;
}
