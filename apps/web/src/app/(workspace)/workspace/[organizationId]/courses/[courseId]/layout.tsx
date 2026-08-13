import { Subnav } from "~/components/routing/app-shell";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId, courseId } = await params;
  const root = `/workspace/${organizationId}/courses/${courseId}`;
  return (
    <Subnav
      nav={[
        "overview",
        "curriculum",
        "settings",
        "cohorts",
        "learners",
        "invites",
      ].map((section) => ({
        href: `${root}/${section}`,
        label: section[0]!.toUpperCase() + section.slice(1),
      }))}
    >
      {children}
    </Subnav>
  );
}
