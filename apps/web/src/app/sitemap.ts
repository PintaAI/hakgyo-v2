import type { MetadataRoute } from "next";

import { env } from "~/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: env.APP_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${env.APP_URL}/catalog`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
