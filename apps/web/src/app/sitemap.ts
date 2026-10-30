import type { MetadataRoute } from "next";

import { env } from "~/env";
import { organizationPublicSlugSchema } from "~/lib/organization-landing";
import { userDocHref } from "~/lib/user-doc-audiences";
import { getAllUserDocs } from "~/lib/user-docs";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [landings, docs] = await Promise.all([
    db.organizationLandingPage.findMany({
      where: { publishedAt: { not: null }, publishedHtml: { not: null } },
      select: {
        publishedAt: true,
        organization: { select: { slug: true } },
      },
    }),
    getAllUserDocs(),
  ]);
  return [
    {
      url: env.APP_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${env.APP_URL}/aplikasi`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${env.APP_URL}/catalog`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...["/privacy", "/terms", "/support", "/integrations"].map((path) => ({
      url: `${env.APP_URL}${path}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    {
      url: `${env.APP_URL}/docs`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...docs.map((doc) => ({
      url: `${env.APP_URL}${userDocHref(doc.audience, doc.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
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
