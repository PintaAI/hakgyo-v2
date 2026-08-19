import type { Metadata } from "next";

import { InviteRedemption } from "~/components/invite-redemption";

export const metadata: Metadata = {
  title: "Invitation Hakgyo",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteRedemption token={token} />;
}
