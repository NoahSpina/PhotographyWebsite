import type { NextConfig } from "next";

const cloudfrontHostname = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

const nextConfig: NextConfig = {
  // Proof images are served from CloudFront. Set NEXT_PUBLIC_CLOUDFRONT_DOMAIN
  // (hostname only, no scheme) to allow next/image to optimize those URLs.
  images: {
    remotePatterns: cloudfrontHostname
      ? [
          {
            protocol: "https",
            hostname: cloudfrontHostname,
          },
        ]
      : [],
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
