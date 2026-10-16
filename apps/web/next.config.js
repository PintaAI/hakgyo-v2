/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import { withSerwist } from "@serwist/turbopack";

/** @type {import("next").NextConfig} */
const config = {
  allowedDevOrigins: ["jennie-linux.tail2268a1.ts.net"],
  poweredByHeader: false,
  outputFileTracingExcludes: {
    // `next/og` uses sharp when it can import it (sharp is an optional
    // dependency of next) and otherwise falls back to its bundled resvg WASM.
    // Sharp's native binaries would add about 35 MB to each function that
    // renders images.
    "/**": [
      "../../node_modules/.bun/sharp@*/**",
      "../../node_modules/.bun/@img+*/**",
    ],
  },
  outputFileTracingIncludes: {
    // The guide pages and the sitemap read the guide Markdown from disk at
    // request time, which the tracer can't follow.
    "/docs/**": ["./src/components/user-docs/**/*.md"],
    "/sitemap.xml": ["./src/components/user-docs/**/*.md"],
  },
  images: {
    // Uploads get a new random key, so an optimized image never changes.
    minimumCacheTTL: 31 * 24 * 60 * 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev",
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow the Serwist worker (served at /serwist/sw.js) to control the
        // whole origin so one worker covers pages + push. Registration pairs
        // this with `scope: "/"`.
        source: "/serwist/sw.js",
        headers: [{ key: "Service-Worker-Allowed", value: "/" }],
      },
      {
        // pdf.js assets copied into public/ by scripts/copy-pdfjs-assets.mjs.
        source: "/pdfjs/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      {
        // Landing documents are framed by the organization's public page and
        // the owner's editor; their route handlers send a sandboxing CSP.
        source: "/api/organization-landing/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        // Interactive UI previews are framed by the guide pages at /docs.
        source: "/docs/pratinjau/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default withSerwist(config);
