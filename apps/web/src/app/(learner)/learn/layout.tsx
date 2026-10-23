import { cookies } from "next/headers";

import { AppPreferencesBootstrap } from "~/components/app-preferences-bootstrap";
import { LearnerBreadcrumb } from "~/components/learner-breadcrumb";
import { LearnerSidebar } from "~/components/learner-sidebar";
import { NotificationBell } from "~/components/notifications/notification-bell";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { requireSession } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";
import { getMySidebarCourses } from "./learner-data";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start the course list with the session check; the redirect for signed-out
  // visitors must still win over the procedure's UNAUTHORIZED error.
  const coursesPromise = getMySidebarCourses();
  coursesPromise.catch(() => undefined);
  const [session, cookieStore] = await Promise.all([
    requireSession(),
    cookies(),
  ]);
  // Ship the badge count with the page instead of a request after hydration.
  const [courses] = await Promise.all([
    coursesPromise,
    api.notification.unreadCount.prefetch(),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <HydrateClient>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppPreferencesBootstrap />
        <LearnerSidebar
          courses={courses}
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
        />
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
            <div className="ml-auto flex items-center px-4">
              <NotificationBell signedIn />
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}
