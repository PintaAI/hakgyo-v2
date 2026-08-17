import { Subnav } from "~/components/layout/subnav";
import { organizationManagerRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  await requireOrganizationRole(organizationSlug, organizationManagerRoles);
  const root = `/workspace/${organizationSlug}/settings`;
  return (
    <Subnav
      nav={[
        { href: `${root}/general`, label: "Umum" },
        { href: `${root}/integrations`, label: "Integrasi" },
      ]}
    >
      {children}
    </Subnav>
  );
}
