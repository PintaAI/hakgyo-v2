import { organizationRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api } from "~/trpc/server";
import { StudioDashboard } from "./studio-dashboard";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const activityLabels = {
  MATERIAL_COMPLETED: "Menyelesaikan materi",
  ASSESSMENT_SUBMITTED: "Mengumpulkan tugas",
  ASSESSMENT_PASSED: "Lulus assessment",
  VOCABULARY_REVIEWED: "Meninjau kosakata",
} as const;

async function TeacherDashboard({
  membership,
  organizationSlug,
}: {
  membership: Awaited<ReturnType<typeof requireOrganizationRole>>;
  organizationSlug: string;
}) {
  const { organizationId, organization } = membership;
  const [courses, cohortsPage, materials, reviewQueue] = await Promise.all([
    api.course.list({ organizationId }),
    api.cohort.listForCurrentMember({
      organizationId,
      includeTotal: true,
      limit: 5,
    }),
    api.content.listMaterials({ organizationId }),
    api.assessment.listAttemptsNeedingReview({
      organizationId,
      includeTotal: true,
      limit: 1,
    }),
  ]);
  const root = `/workspace/${organizationSlug}`;
  const pendingReviews = reviewQueue.total ?? reviewQueue.items.length;

  return (
    <StudioDashboard
      data={{
        name: organization.name,
        role: "Pengajar",
        root,
        canCreateCourse:
          organization.permissionMode === "SIMPLE" ||
          organization.teacherCanCreateCourse,
        courses,
        cohorts: cohortsPage.items,
        pendingReviews,
        stats: [
          {
            label: "Course saya",
            value: courses.length,
            href: `${root}/courses`,
          },
          {
            label: "Group belajar",
            value: cohortsPage.total ?? cohortsPage.items.length,
            href: `${root}/courses`,
          },
          {
            label: "Materi saya",
            value: materials.length,
            href: `${root}/library/materials`,
          },
          {
            label: "Perlu review",
            value: pendingReviews,
            href: `${root}/reviews`,
          },
        ],
      }}
    />
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationRoles,
  );
  if (membership.role === "TEACHER") {
    return (
      <TeacherDashboard
        membership={membership}
        organizationSlug={organizationSlug}
      />
    );
  }
  const { organizationId, organization, role } = membership;
  const [analytics, courses, cohortsPage, activity] = await Promise.all([
    api.organization.getDashboardAnalytics({ organizationId }),
    api.course.list({ organizationId }),
    api.cohort.listByOrganization({ organizationId, limit: 5 }),
    api.organization.getRecentActivity({ organizationId }),
  ]);
  const root = `/workspace/${organizationSlug}`;

  return (
    <StudioDashboard
      data={{
        name: organization.name,
        role: role === "OWNER" ? "Pemilik" : "Admin",
        root,
        canCreateCourse: true,
        courses,
        cohorts: cohortsPage.items,
        pendingReviews: analytics.actionItems.attemptsInReview,
        activity: activity.map((item) => ({
          id: item.id,
          title: item.user.name,
          detail: `${activityLabels[item.action]} · +${item.xpAwarded} XP · ${dateFormatter.format(item.occurredAt)}`,
        })),
        stats: [
          {
            label: "Total course",
            value: analytics.courses.total,
            href: `${root}/courses`,
          },
          {
            label: "Group belajar",
            value: analytics.cohorts.total,
            href: `${root}/courses`,
          },
          {
            label: "Anggota",
            value: analytics.members,
            href: `${root}/members`,
          },
          {
            label: "Perlu review",
            value: analytics.actionItems.attemptsInReview,
            href: `${root}/reviews`,
          },
        ],
      }}
    />
  );
}
