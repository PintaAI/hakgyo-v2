import { AppPreferencesBootstrap } from "~/components/app-preferences-bootstrap";
import { DocsAppSidebar } from "~/components/app-sidebar";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { userDocAudiences, userDocHref } from "~/lib/user-doc-audiences";
import { getUserDocs } from "~/lib/user-docs";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The guide is public and static: it reads no session or cookies, so the
  // pages are prerendered and served without a function call.
  const sections = await Promise.all(
    userDocAudiences.map(async (audience) => ({
      audience: audience.id,
      label: audience.label,
      shortLabel: audience.shortLabel,
      href: userDocHref(audience.id),
      items: (await getUserDocs(audience.id)).map(
        ({ title, slug, iconName }) => ({
          title,
          href: userDocHref(audience.id, slug),
          iconName,
        }),
      ),
    })),
  );

  return (
    <SidebarProvider>
      <AppPreferencesBootstrap />
      <DocsAppSidebar sections={sections} />
      <SidebarInset>
        <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur md:rounded-t-xl">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <span className="text-sm font-medium">Panduan Hakgyo</span>
          </div>
        </header>
        <div className="flex-1 px-4 py-6 sm:px-5 sm:py-8 md:px-8 lg:px-12">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
