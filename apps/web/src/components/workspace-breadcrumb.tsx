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
import type { OrganizationRole } from "~/lib/access";

const sectionLabels: Record<string, string> = {
  courses: "Courses",
  dashboard: "Dashboard",
  library: "Content library",
  members: "Members",
  reviews: "Reviews",
  settings: "Settings",
};

export function WorkspaceBreadcrumb({
  organizationSlug,
  role,
}: {
  organizationSlug: string;
  role: OrganizationRole;
}) {
  const pathname = usePathname();
  const section = pathname.split("/").filter(Boolean)[2];
  const currentLabel = (section && sectionLabels[section]) ?? "Workspace";
  const workspaceHome = `/workspace/${organizationSlug}/${
    role === "TEACHER" ? "courses" : "dashboard"
  }`;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink render={<Link href={workspaceHome} />}>
            Workspace
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
