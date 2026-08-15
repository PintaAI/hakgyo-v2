import { Subnav } from "~/components/layout/subnav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const root = `/workspace/${organizationSlug}/library`;
  return (
    <Subnav
      nav={["materials", "vocabulary", "assessments"].map((section) => ({
        href: `${root}/${section}`,
        label: section[0]!.toUpperCase() + section.slice(1),
      }))}
    >
      {children}
    </Subnav>
  );
}
