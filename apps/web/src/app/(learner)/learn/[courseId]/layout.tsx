import { Subnav } from "~/components/routing/app-shell";

export default async function LearningCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <Subnav nav={[{ href: `/learn/${courseId}`, label: "Course outline" }]}>
      {children}
    </Subnav>
  );
}
