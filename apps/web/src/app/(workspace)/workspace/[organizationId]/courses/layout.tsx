import { Subnav } from "~/components/layout/subnav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const root = `/workspace/${organizationId}/courses`;
  return (
    <Subnav
      nav={[
        { href: root, label: "All courses" },
        { href: `${root}/new`, label: "New course" },
      ]}
    >
      {children}
    </Subnav>
  );
}
