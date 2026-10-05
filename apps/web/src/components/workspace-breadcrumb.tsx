"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
const sectionLabels: Record<string, string> = {
  "landing-page": "Landing page",
  courses: "Kursus",
  dashboard: "Dashboard",
  library: "Bahan ajar",
  members: "Anggota",
  "quiz-publik": "Quiz publik",
  reviews: "Review",
  settings: "Pengaturan",
};

/** Pages below a kursus, keyed by the path segment after its id. */
const coursePageLabels: Record<string, string> = {
  cohorts: "Group belajar",
  kurikulum: "Kurikulum",
};

export function WorkspaceBreadcrumb({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[2];
  const sectionLabel = (section && sectionLabels[section]) ?? "Workspace";
  const workspaceHome = `/workspace/${organizationSlug}/dashboard`;
  // Inside a kursus, the section links back to the list and the page below
  // it is named, e.g. Workspace › Kursus › Group belajar.
  const inCourse = section === "courses" && segments.length > 3;
  const pageLabel = !inCourse
    ? null
    : segments[3] === "new"
      ? "Kursus baru"
      : (coursePageLabels[segments[4] ?? ""] ?? "Detail kursus");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink render={<Link href={workspaceHome} />}>
            Workspace
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        {pageLabel ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link href={`/workspace/${organizationSlug}/courses`} />
                }
              >
                {sectionLabel}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
