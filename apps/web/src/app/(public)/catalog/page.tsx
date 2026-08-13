import Link from "next/link";
import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default function CatalogPage() {
  return (
    <div className="space-y-4">
      <RoutePlaceholder title="Course catalog" />
      <Link
        className="text-sm underline underline-offset-4"
        href="/catalog/course-demo"
      >
        Open a sample course route
      </Link>
    </div>
  );
}
