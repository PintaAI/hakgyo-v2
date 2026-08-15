import { Subnav } from "~/components/layout/subnav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  const root = `/workspace/${organizationSlug}/courses/${courseId}/cohorts`;
  return (
    <Subnav
      nav={[
        { href: root, label: "Cohorts" },
        { href: `${root}/new`, label: "New cohort" },
      ]}
    >
      {children}
    </Subnav>
  );
}
