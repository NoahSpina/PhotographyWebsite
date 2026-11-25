import type { NextConfig } from "next";

const cloudfrontHostname = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN?.trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Proof images are served from CloudFront. Set NEXT_PUBLIC_CLOUDFRONT_DOMAIN
  // (hostname only, no scheme) to allow next/image to optimize those URLs.
  // Unsplash serves the curated placeholder photography in src/lib/site-config.ts.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
      },
      ...(cloudfrontHostname
        ? [
            {
              protocol: "https" as const,
              hostname: cloudfrontHostname,
            },
          ]
        : []),
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
