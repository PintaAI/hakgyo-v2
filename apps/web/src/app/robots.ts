import type { MetadataRoute } from "next";

import { env } from "~/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/catalog"],
      disallow: [
        "/api/",
        "/auth",
        "/docs",
        "/invite",
        "/learn",
        "/oauth",
        "/workspace",
      ],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
    host: env.APP_URL,
  };
}
