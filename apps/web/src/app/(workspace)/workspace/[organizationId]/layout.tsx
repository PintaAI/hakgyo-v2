import { cookies } from "next/headers";

import { AppSidebar } from "~/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar organizationId={organizationId} />
      <SidebarInset>
        <header className="bg-background/95 supports-backdrop-filter:bg-background/75 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="bg-border h-4 w-px" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Workspace</p>
            <p className="text-muted-foreground truncate text-xs">
              {organizationId}
            </p>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
