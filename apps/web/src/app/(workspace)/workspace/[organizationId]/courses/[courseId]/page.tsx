import { redirect } from "next/navigation";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  redirect(`/workspace/${organizationSlug}/courses/${courseId}/overview`);
}
