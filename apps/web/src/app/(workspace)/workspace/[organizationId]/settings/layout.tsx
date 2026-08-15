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
  const { organizationId } = await params;
  await requireOrganizationRole(organizationId, organizationManagerRoles);
  const root = `/workspace/${organizationId}/settings`;
  return (
    <Subnav
      nav={[
        { href: `${root}/general`, label: "General" },
        { href: `${root}/integrations`, label: "Integrations" },
      ]}
    >
      {children}
    </Subnav>
  );
}
