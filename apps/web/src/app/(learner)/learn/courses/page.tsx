import Link from "next/link";
import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default function LearningCoursesPage() {
  return (
    <div className="space-y-4">
      <RoutePlaceholder title="My courses" />
      <Link className="text-sm underline" href="/learn/course-demo">
        Open sample course
      </Link>
    </div>
  );
}
