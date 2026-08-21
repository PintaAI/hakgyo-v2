export default async function LearningCourseLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  return children;
}
