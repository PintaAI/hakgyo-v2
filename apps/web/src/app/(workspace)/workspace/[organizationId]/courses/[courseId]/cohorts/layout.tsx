import { Subnav } from "~/components/routing/app-shell";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId, courseId } = await params;
  const root = `/workspace/${organizationId}/courses/${courseId}/cohorts`;
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
