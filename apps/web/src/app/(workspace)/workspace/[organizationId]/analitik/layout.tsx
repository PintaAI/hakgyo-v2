import { Suspense } from "react";

import {
  AnalyticsPeriodPicker,
  AnalyticsTabs,
} from "~/components/analytics/analytics-nav";
import { PageHeader } from "~/components/ui/page-header";
import { organizationManagerRoles, organizationRoles } from "~/lib/access";
import { requireOrganizationRole } from "~/server/auth/dal";

export default async function AnalyticsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationRoles,
  );
  const root = `/workspace/${organizationSlug}/analitik`;
  const isManager = organizationManagerRoles.includes(membership.role);
  const tabs = [
    { href: `${root}/performa`, label: "Performa" },
    { href: `${root}/murid`, label: "Murid" },
    ...(isManager ? [{ href: `${root}/pendapatan`, label: "Pendapatan" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
      <PageHeader
        eyebrow={isManager ? "Seluruh organisasi" : "Kelas yang Anda pegang"}
        title="Analitik"
        description={
          isManager
            ? "Hasil belajar, pertumbuhan murid, dan pendapatan organisasi Anda."
            : "Hasil belajar dan keaktifan murid di kelas yang Anda pegang."
        }
      />
      <div className="space-y-4">
        <Suspense>
          <AnalyticsTabs tabs={tabs} />
          <AnalyticsPeriodPicker />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
