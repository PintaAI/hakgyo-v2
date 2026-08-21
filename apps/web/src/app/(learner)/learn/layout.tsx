import { cookies } from "next/headers";
import { Hanken_Grotesk, Inter } from "next/font/google";

import { LearnerBreadcrumb } from "~/components/learner-breadcrumb";
import { LearnerSidebar } from "~/components/learner-sidebar";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { requireSession } from "~/server/auth/dal";
import { api } from "~/trpc/server";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  const [cookieStore, courses] = await Promise.all([
    cookies(),
    api.learning.listMyCourses(),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className={cn(
        hanken.variable,
        inter.variable,
        "font-[family-name:var(--font-inter)]",
      )}
    >
      <LearnerSidebar courses={courses} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <LearnerBreadcrumb />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
