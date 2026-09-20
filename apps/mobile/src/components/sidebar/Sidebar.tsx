import { useGlobalSearchParams, usePathname } from "expo-router";
import { memo, useEffect, useState } from "react";

import { authClient } from "../../lib/auth-client";
import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { CourseSidebarContent } from "./CourseSidebarContent";
import { MainSidebarContent } from "./MainSidebarContent";
import { SidebarShell } from "./SidebarShell";
import { getCurrentAppArea } from "./routing";

type SidebarProps = {
  onClose: () => void;
  onNavigate: (action: () => void) => void;
  onOpenProfile: () => void;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export const Sidebar = memo(function Sidebar({
  onClose,
  onNavigate,
  onOpenProfile,
}: SidebarProps) {
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{
    courseId?: string | string[];
    courseItemId?: string | string[];
  }>();
  const outlineCourseId = firstParam(globalParams.courseId);
  const outlineItemId = firstParam(globalParams.courseItemId);
  const detectedArea = getCurrentAppArea(pathname, outlineCourseId);
  // Allow manual exit from course mode back to the main menu
  // without changing the route.
  const [forceMain, setForceMain] = useState(false);
  useEffect(() => {
    setForceMain(false);
  }, [outlineCourseId]);
  const currentArea =
    detectedArea === "course" && forceMain ? "main" : detectedArea;
  const isCourseMode = currentArea === "course" && Boolean(outlineCourseId);
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && isCourseMode), retry: false },
  );
  const dashboardOutline = dashboard.data?.outlines[outlineCourseId];
  const outlineQuery = api.learning.getCourseOutline.useQuery(
    { courseId: outlineCourseId },
    {
      enabled: Boolean(
        session && isCourseMode && !dashboard.isPending && !dashboardOutline,
      ),
      retry: false,
    },
  );
  const course = dashboardOutline ?? outlineQuery.data;
  const courseTitle = course?.title ?? "Course";
  const courseThumbnail = course?.thumbnailUrl ?? null;
  const courseOrgName = course?.organization.name;
  const courseInitial = courseTitle.trim().charAt(0).toUpperCase() || "C";

  if (isCourseMode && outlineCourseId) {
    return (
      <SidebarShell
        onOpenProfile={onOpenProfile}
        subtitle={courseOrgName ?? "Contents"}
        thumbnailFallbackLabel={courseInitial}
        thumbnailUrl={courseThumbnail}
        title={courseTitle}
      >
        <CourseSidebarContent
          courseId={outlineCourseId}
          currentItemId={outlineItemId || undefined}
          onClose={onClose}
          onExitToMenu={() => setForceMain(true)}
          onNavigate={onNavigate}
        />
      </SidebarShell>
    );
  }

  return (
    <SidebarShell onOpenProfile={onOpenProfile} subtitle="Hakgyo" title="Menu">
      <MainSidebarContent onNavigate={onNavigate} />
    </SidebarShell>
  );
});
