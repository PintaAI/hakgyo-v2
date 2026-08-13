import { redirect } from "next/navigation";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId, courseId } = await params;
  redirect(`/workspace/${organizationId}/courses/${courseId}/overview`);
}
