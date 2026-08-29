import { Hanken_Grotesk, Inter } from "next/font/google";

import { CourseWorkspace } from "~/components/course-workspace";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function CoursePage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  const workspace = await api.course.getWorkspaceOverview({
    courseId,
    organizationSlug,
  });

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "w-full font-[family-name:var(--font-inter)]",
      )}
    >
      <CourseWorkspace workspace={workspace} />
    </div>
  );
}
