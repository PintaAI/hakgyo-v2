import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationLandingPage } from "~/components/organization-landing-page";
import { env } from "~/env";
import { db } from "~/server/db";
import { getPublicOrganizationLanding } from "~/server/organization-landing/service";

// Publication changes must immediately remove public content, including metadata.
export const dynamic = "force-dynamic";

const getLanding = cache(async (slug: string) => {
  const landing = await getPublicOrganizationLanding({ db, slug });
  if (!landing) notFound();
  return landing;
});

type Props = { params: Promise<{ orgSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params;
  const { organization, config } = await getLanding(orgSlug);
  const title = config.seoTitle || `${organization.name} — ${config.headline}`;
  const description = config.seoDescription || config.description;
  const image =
    config.socialImageUrl || config.heroImageUrl || organization.logoUrl;
  const url = new URL(`/${organization.slug}`, env.APP_URL).toString();
  return {
    title: { absolute: title },
    description,
    authors: [{ name: organization.name }],
    creator: organization.name,
    publisher: organization.name,
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
  const data = await getLanding(orgSlug);
  const { organization, config, courses } = data;
  const url = new URL(`/${organization.slug}`, env.APP_URL).toString();
  const organizationId = `${url}#organization`;
  const coursesVisible =
    config.sectionOrder.includes("courses") &&
    !config.hiddenSections.includes("courses");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": organizationId,
        name: organization.name,
        url,
        description: config.description,
        ...(organization.logoUrl ? { logo: organization.logoUrl } : {}),
        ...(config.contactEmail ? { email: config.contactEmail } : {}),
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: config.seoTitle || config.headline,
        description: config.seoDescription || config.description,
        about: { "@id": organizationId },
      },
      ...(coursesVisible && courses.length
        ? [
            {
              "@type": "ItemList",
              itemListElement: courses.map((course, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Course",
                  name: course.title,
                  description: course.description ?? course.title,
                  url: new URL(`/catalog/${course.id}`, env.APP_URL).toString(),
                  provider: { "@id": organizationId },
                },
              })),
            },
          ]
        : []),
      ...(config.sectionOrder.includes("faq") &&
      !config.hiddenSections.includes("faq") &&
      config.faq.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: config.faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ]
        : []),
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <OrganizationLandingPage data={data} />
    </>
  );
}
