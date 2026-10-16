import type { MetadataRoute } from "next";

import { env } from "~/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/catalog"],
      disallow: [
        "/api/",
        // Match app routes exactly so organization slugs such as learn-korean
        // remain crawlable at the root.
        ...["auth", "invite", "learn", "oauth", "workspace"].flatMap(
          (route) => [`/${route}$`, `/${route}/`],
        ),
        // Bare UI previews framed by the guide pages.
        "/docs/pratinjau/",
      ],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
    host: env.APP_URL,
  };
}
