import { Subnav } from "~/components/layout/subnav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    organizationId: string;
    courseId: string;
    cohortId: string;
  }>;
}) {
  const values = await params;
  const organizationSlug = values.organizationId;
  const root = `/workspace/${organizationSlug}/courses/${values.courseId}/cohorts/${values.cohortId}`;
  return (
    <Subnav
      nav={["overview", "staff", "learners", "meetings"].map((section) => ({
        href: `${root}/${section}`,
        label: section[0]!.toUpperCase() + section.slice(1),
      }))}
    >
      {children}
    </Subnav>
  );
}
