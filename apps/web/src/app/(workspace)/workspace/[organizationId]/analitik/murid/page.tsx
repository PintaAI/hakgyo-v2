import { LearnersView } from "~/components/analytics/learners-view";
import { organizationRoles } from "~/lib/access";
import {
  parseAnalyticsPeriod,
  resolveAnalyticsRange,
} from "~/lib/analytics/period";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function LearnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const [{ organizationId: organizationSlug }, { periode }] = await Promise.all(
    [params, searchParams],
  );
  const period = parseAnalyticsPeriod(periode);
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationRoles,
  );
  const data = await api.analytics.learners({
    organizationId: membership.organizationId,
    period,
  });

  return (
    <LearnersView
      data={data}
      period={period}
      granularity={resolveAnalyticsRange(period).granularity}
      root={`/workspace/${organizationSlug}`}
      scoped={membership.role === "TEACHER"}
      now={new Date()}
    />
  );
}
