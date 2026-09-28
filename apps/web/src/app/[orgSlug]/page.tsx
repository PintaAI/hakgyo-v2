import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "~/env";
import { db } from "~/server/db";
import { getPublishedLanding } from "~/server/organization-landing/service";

// Publication changes must immediately remove public content, including metadata.
export const dynamic = "force-dynamic";

const getLanding = cache(async (slug: string) => {
  const landing = await getPublishedLanding({ db, slug });
  if (!landing) notFound();
  return landing;
});

type Props = { params: Promise<{ orgSlug: string }> };

// The document itself renders in a sandboxed frame, so link previews and
// search results read this server-rendered metadata from its <head>.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params;
  const { organization, metadata } = await getLanding(orgSlug);
  const title = metadata.title || organization.name;
  const description = metadata.description || undefined;
  const image = metadata.image ?? organization.logoUrl;
  const url = new URL(`/${organization.slug}`, env.APP_URL).toString();
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: organization.name,
      ...(image ? { images: [{ url: image, alt: organization.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    ...(organization.logoUrl
      ? { icons: { icon: organization.logoUrl, apple: organization.logoUrl } }
      : {}),
  };
}

export default async function PublicOrganizationPage({ params }: Props) {
  const { orgSlug } = await params;
  const { organization, metadata, publishedAt } = await getLanding(orgSlug);
  return (
    <iframe
      // Remount after each publish so the frame never shows a cached document.
      key={publishedAt.toISOString()}
      src={`/api/organization-landing/published/${encodeURIComponent(organization.slug)}`}
      title={metadata.title || organization.name}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      className="fixed inset-0 size-full border-0"
    />
  );
}
