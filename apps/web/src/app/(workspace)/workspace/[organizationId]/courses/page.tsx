import Link from "next/link";
import { BookOpenIcon, PlusIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <BookOpenIcon className="size-4" />
            Learning spaces
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Courses
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Create, organize, and manage your organization&apos;s courses.
          </p>
        </div>
        <Link
          href={`/workspace/${organizationId}/courses/new`}
          className={buttonVariants()}
        >
          <PlusIcon data-icon="inline-start" />
          New course
        </Link>
      </div>
    </div>
  );
}
