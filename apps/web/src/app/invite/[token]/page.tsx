import type { Metadata } from "next";

import { InviteRedemption } from "~/components/invite-redemption";
import { resolveUnifiedInvite } from "~/server/invites/unified";
import { db } from "~/server/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  try {
    const invite = await resolveUnifiedInvite(db, token);
    const title =
      invite.type === "COHORT" ? invite.cohort.name : invite.organization.name;
    const description =
      invite.type === "ORGANIZATION"
        ? "Bergabung dengan organisasi di Hakgyo."
        : invite.type === "COHORT"
          ? `Bergabung dengan kelas ${invite.course.title} di Hakgyo.`
          : "Undangan ini sudah tidak berlaku.";
    const thumbnailUrl =
      invite.type === "COHORT" ? invite.course.thumbnailUrl : null;

    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        images: thumbnailUrl ? [{ url: thumbnailUrl, alt: title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: thumbnailUrl ? [thumbnailUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Invitation Hakgyo",
      robots: { index: false, follow: false },
    };
  }
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div>
      <InviteRedemption token={token} />
    </div>
  );
}
