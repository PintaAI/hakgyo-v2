import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { AppSidebar } from "~/components/app-sidebar";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { WorkspaceBreadcrumb } from "~/components/workspace-breadcrumb";
import { isOrganizationRole, organizationRoleHeader } from "~/lib/access";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const roleHeader = headerStore.get(organizationRoleHeader);
  if (!isOrganizationRole(roleHeader)) notFound();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar organizationId={organizationId} role={roleHeader} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <WorkspaceBreadcrumb
              organizationId={organizationId}
              role={roleHeader}
            />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
