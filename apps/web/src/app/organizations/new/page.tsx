import type { Metadata } from "next";

import { FlowShell } from "~/components/brand/flow-shell";
import { OrganizationCreateForm } from "~/components/organization-create-form";
import { requireSession } from "~/server/auth/dal";

export const metadata: Metadata = {
  title: "Buat organization",
  robots: { index: false, follow: false },
};

export default async function NewOrganizationPage() {
  const session = await requireSession();
  return (
    <FlowShell>
      <OrganizationCreateForm userId={session.user.id} />
    </FlowShell>
  );
}
