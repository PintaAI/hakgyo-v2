import { PerformanceView } from "~/components/analytics/performance-view";
import { organizationRoles } from "~/lib/access";
import {
  parseAnalyticsPeriod,
  resolveAnalyticsRange,
} from "~/lib/analytics/period";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function PerformancePage({
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
  const data = await api.analytics.performance({
    organizationId: membership.organizationId,
    period,
  });

  return (
    <PerformanceView
      data={data}
      period={period}
      granularity={resolveAnalyticsRange(period).granularity}
      root={`/workspace/${organizationSlug}`}
    />
  );
}
