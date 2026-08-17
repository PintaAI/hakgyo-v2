import { cookies } from "next/headers";

import { AppSidebar } from "~/components/app-sidebar";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { WorkspaceBreadcrumb } from "~/components/workspace-breadcrumb";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const [cookieStore, membership] = await Promise.all([
    cookies(),
    requireOrganizationMembershipBySlug(organizationSlug),
  ]);
  const courses = await api.course.list({
    organizationId: membership.organizationId,
  });
  const recentCourses = courses
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3)
    .map((course) => ({
      id: course.id,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl,
    }));
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const role = membership.role;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        organizationSlug={organizationSlug}
        organization={membership.organization}
        role={role}
        recentCourses={recentCourses}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <WorkspaceBreadcrumb
              organizationSlug={organizationSlug}
              role={role}
            />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
