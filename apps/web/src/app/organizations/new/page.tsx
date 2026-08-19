import type { Metadata } from "next";

import { OrganizationCreateForm } from "~/components/organization-create-form";
import { requireSession } from "~/server/auth/dal";

export const metadata: Metadata = {
  title: "Buat organization",
  robots: { index: false, follow: false },
};

export default async function NewOrganizationPage() {
  const session = await requireSession();
  return <OrganizationCreateForm userId={session.user.id} />;
}
