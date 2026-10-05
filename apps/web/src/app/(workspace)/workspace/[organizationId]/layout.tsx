import { cookies } from "next/headers";

import { AppSidebar } from "~/components/app-sidebar";
import { NotificationBell } from "~/components/notifications/notification-bell";
import { OrganizationThemeBootstrap } from "~/components/organization-theme-bootstrap";
import { OrganizationThemeProvider } from "~/components/organization-theme-provider";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { WorkspaceBottomNav } from "~/components/workspace-bottom-nav";
import { WorkspaceBreadcrumb } from "~/components/workspace-breadcrumb";
import { parseOrganizationTheme } from "~/lib/organization-theme";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { isSuperadminEmail } from "~/server/authorization/superadmin";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const [cookieStore, membership, session] = await Promise.all([
    cookies(),
    requireOrganizationMembershipBySlug(organizationSlug),
    getSession(),
  ]);
  const role = membership.role;
  const showCohortShortcuts = role === "OWNER" || role === "TEACHER";
  const [recentCourses, cohortShortcutsPage] = await Promise.all([
    api.course.listRecent({
      organizationId: membership.organizationId,
      take: 3,
    }),
    showCohortShortcuts
      ? api.cohort.listForCurrentMember({
          organizationId: membership.organizationId,
          limit: 50,
        })
      : null,
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const defaultRightOpen =
    cookieStore.get("right_sidebar_state")?.value !== "false";
  const organizationTheme = membership.organization.themeEnabled
    ? parseOrganizationTheme(membership.organization.theme)
    : null;

  return (
    <>
      <OrganizationThemeBootstrap theme={organizationTheme} />
      <OrganizationThemeProvider theme={organizationTheme}>
        <SidebarProvider
          defaultOpen={defaultOpen}
          defaultRightOpen={defaultRightOpen}
        >
          <AppSidebar
            organizationSlug={organizationSlug}
            organization={membership.organization}
            role={role}
            recentCourses={recentCourses}
            cohortShortcuts={cohortShortcutsPage?.items ?? []}
            showSuperadmin={Boolean(
              session?.user && isSuperadminEmail(session.user.email),
            )}
          />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
              <div className="flex min-w-0 items-center gap-2 px-4">
                {/* Phones reach the sidebar through the bottom nav's Menu tab. */}
                <SidebarTrigger className="-ml-1 max-md:hidden" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-vertical:h-4 data-vertical:self-center max-md:hidden"
                />
                <WorkspaceBreadcrumb organizationSlug={organizationSlug} />
              </div>
              <div className="ml-auto flex items-center gap-1 px-4">
                <NotificationBell />
                <div
                  id="workspace-editor-sidebar-trigger-outlet"
                  className="contents"
                />
              </div>
            </header>
            <div
              data-workspace-main
              className="flex-1 p-4 max-md:pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8"
            >
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </div>
            <WorkspaceBottomNav organizationSlug={organizationSlug} />
          </SidebarInset>
          <div id="workspace-editor-sidebar-outlet" className="contents" />
        </SidebarProvider>
      </OrganizationThemeProvider>
    </>
  );
}
