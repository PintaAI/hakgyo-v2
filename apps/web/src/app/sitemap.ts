import type { MetadataRoute } from "next";

import { env } from "~/env";
import { organizationPublicSlugSchema } from "~/lib/organization-landing";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const landings = await db.organizationLandingPage.findMany({
    where: { publishedAt: { not: null }, publishedHtml: { not: null } },
    select: {
      publishedAt: true,
      organization: { select: { slug: true } },
    },
  });
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
    {
      url: `${env.APP_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...landings
      .filter(
        (landing) =>
          organizationPublicSlugSchema.safeParse(landing.organization.slug)
            .success,
      )
      .map((landing) => ({
        url: new URL(`/${landing.organization.slug}`, env.APP_URL).toString(),
        lastModified: landing.publishedAt ?? undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];
}
