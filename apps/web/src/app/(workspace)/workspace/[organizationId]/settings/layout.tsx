import { Subnav } from "~/components/layout/subnav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
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
