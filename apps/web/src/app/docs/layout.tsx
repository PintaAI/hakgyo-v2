import { cookies } from "next/headers";

import { DocsAppSidebar } from "~/components/app-sidebar";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { getUserDocs } from "~/lib/user-docs";
import { requireSession } from "~/server/auth/dal";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, cookieStore, docs] = await Promise.all([
    requireSession(),
    cookies(),
    getUserDocs(),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const navigation = docs.map(({ title, slug, iconName, locale }) => ({
    title,
    href: `/docs/${slug}`,
    iconName,
    locale,
  }));

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <DocsAppSidebar navigation={navigation} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear md:border-b-0">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <span className="text-sm font-medium">User documentation</span>
          </div>
        </header>
        <div className="flex-1 px-5 py-8 md:px-8 lg:px-12">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
