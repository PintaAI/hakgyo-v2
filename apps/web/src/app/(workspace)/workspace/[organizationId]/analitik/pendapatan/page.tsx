import { RevenueView } from "~/components/analytics/revenue-view";
import { organizationManagerRoles } from "~/lib/access";
import {
  parseAnalyticsPeriod,
  resolveAnalyticsRange,
} from "~/lib/analytics/period";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function RevenuePage({
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
  // Teachers are sent back to the dashboard; revenue is for owners and admins.
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationManagerRoles,
  );
  const data = await api.analytics.revenue({
    organizationId: membership.organizationId,
    period,
  });

  return (
    <RevenueView
      data={data}
      period={period}
      granularity={resolveAnalyticsRange(period).granularity}
      root={`/workspace/${organizationSlug}`}
    />
  );
}
