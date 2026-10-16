import { ChangeLine } from "~/components/analytics/analytics-parts";
import { organizationRoles } from "~/lib/access";
import {
  countChange,
  formatCount,
  formatPercent,
  formatRupiahAmount,
  ratioChange,
} from "~/lib/analytics/format";
import type { AnalyticsSummary } from "~/server/analytics/summary";
import { requireOrganizationRole } from "~/server/auth/dal";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { StudioDashboard } from "./studio-dashboard";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dashboardCourseLimit = 4;

function insightsFor(summary: AnalyticsSummary, root: string) {
  const comparison = "30 hari sebelumnya";
  return {
    href: `${root}/analitik/performa`,
    items: [
      {
        label: "Murid aktif",
        value: formatCount(summary.activeLearners.current),
        detail: (
          <ChangeLine
            change={countChange(
              summary.activeLearners.current,
              summary.activeLearners.previous,
            )}
            comparison={comparison}
          />
        ),
      },
      {
        label: "Rata-rata nilai",
        value: formatPercent(summary.averageScore.current),
        detail: (
          <ChangeLine
            change={ratioChange(
              summary.averageScore.current,
              summary.averageScore.previous,
            )}
            comparison={comparison}
          />
        ),
      },
      ...(summary.revenue
        ? [
            {
              label: "Pendapatan",
              value: formatRupiahAmount(summary.revenue.current),
              detail: (
                <ChangeLine
                  change={countChange(
                    summary.revenue.current,
                    summary.revenue.previous,
                  )}
                  comparison={comparison}
                />
              ),
            },
          ]
        : []),
    ],
  };
}

const activityLabels = {
  MATERIAL_COMPLETED: "Menyelesaikan materi",
  ASSESSMENT_SUBMITTED: "Mengumpulkan tugas",
  ASSESSMENT_PASSED: "Lulus tugas",
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
  const [session, courses, cohortsPage, materialCount, reviewQueue, summary] =
    await Promise.all([
      getSession(),
      api.course.list({ organizationId }),
      api.cohort.listForCurrentMember({
        organizationId,
        includeTotal: true,
        limit: 5,
      }),
      api.content.countMaterials({ organizationId }),
      api.assessment.listAttemptsNeedingReview({
        organizationId,
        includeTotal: true,
        limit: 1,
      }),
      api.analytics.summary({ organizationId, period: "30h" }),
    ]);
  const root = `/workspace/${organizationSlug}`;
  const pendingReviews = reviewQueue.total ?? reviewQueue.items.length;

  return (
    <StudioDashboard
      data={{
        name: organization.name,
        organizationLogoUrl: organization.logoUrl,
        userName: session?.user.name ?? "",
        userImage: session?.user.image ?? null,
        role: "Pengajar",
        root,
        canCreateCourse:
          organization.permissionMode === "SIMPLE" ||
          organization.teacherCanCreateCourse,
        // The dashboard only renders the first few course cards.
        courses: courses.slice(0, dashboardCourseLimit),
        cohorts: cohortsPage.items,
        pendingReviews,
        insights: insightsFor(summary, root),
        stats: [
          {
            label: "Kurikulum saya",
            value: courses.length,
            href: `${root}/courses`,
            icon: "course",
          },
          {
            label: "Kelas",
            value: cohortsPage.total ?? cohortsPage.items.length,
            href: `${root}/courses`,
            icon: "cohort",
          },
          {
            label: "Materi saya",
            value: materialCount,
            href: `${root}/library/materials`,
            icon: "material",
          },
          {
            label: "Perlu review",
            value: pendingReviews,
            href: `${root}/reviews`,
            icon: "review",
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
  const [session, analytics, courses, cohortsPage, activity, summary] =
    await Promise.all([
      getSession(),
      api.organization.getDashboardAnalytics({ organizationId }),
      api.course.list({ organizationId }),
      api.cohort.listByOrganization({ organizationId, limit: 5 }),
      api.organization.getRecentActivity({ organizationId }),
      api.analytics.summary({ organizationId, period: "30h" }),
    ]);
  const root = `/workspace/${organizationSlug}`;

  return (
    <StudioDashboard
      data={{
        name: organization.name,
        organizationLogoUrl: organization.logoUrl,
        userName: session?.user.name ?? "",
        userImage: session?.user.image ?? null,
        role: role === "OWNER" ? "Pemilik" : "Admin",
        root,
        canCreateCourse: true,
        // The dashboard only renders the first few course cards.
        courses: courses.slice(0, dashboardCourseLimit),
        cohorts: cohortsPage.items,
        pendingReviews: analytics.actionItems.attemptsInReview,
        insights: insightsFor(summary, root),
        activity: activity.map((item) => ({
          id: item.id,
          title: item.user.name,
          detail: `${activityLabels[item.action]} · +${item.xpAwarded} XP · ${dateFormatter.format(item.occurredAt)}`,
        })),
        stats: [
          {
            label: "Total kurikulum",
            value: analytics.courses.total,
            href: `${root}/courses`,
            icon: "course",
          },
          {
            label: "Kelas",
            value: analytics.cohorts.total,
            href: `${root}/courses`,
            icon: "cohort",
          },
          {
            label: "Anggota",
            value: analytics.members,
            href: `${root}/members`,
            icon: "member",
          },
          {
            label: "Perlu review",
            value: analytics.actionItems.attemptsInReview,
            href: `${root}/reviews`,
            icon: "review",
          },
        ],
      }}
    />
  );
}
