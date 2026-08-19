import type { Metadata } from "next";

import { OrganizationOnboarding } from "~/components/organization-onboarding";
import { requireSession } from "~/server/auth/dal";

export const metadata: Metadata = {
  title: "Mulai dengan Hakgyo",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await requireSession();
  return <OrganizationOnboarding userId={session.user.id} />;
}
