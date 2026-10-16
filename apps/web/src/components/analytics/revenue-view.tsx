import { WalletIcon } from "lucide-react";

import {
  AnalyticsSection,
  ChangeLine,
  RankedRows,
} from "~/components/analytics/analytics-parts";
import { TrendChart } from "~/components/analytics/trend-chart";
import { buttonVariants } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import Link from "~/components/link";
import { StatStrip } from "~/components/ui/stat-strip";
import {
  countChange,
  formatCount,
  formatPercent,
  formatRupiahAmount,
} from "~/lib/analytics/format";
import {
  analyticsComparisonLabels,
  type AnalyticsGranularity,
  type AnalyticsPeriod,
} from "~/lib/analytics/period";
import type { RevenueAnalytics } from "~/server/analytics/revenue";

const methodLabels = { QRIS: "QRIS", BANK_TRANSFER: "Transfer bank" } as const;

export function RevenueView({
  data,
  period,
  granularity,
  root,
}: {
  data: RevenueAnalytics;
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  root: string;
}) {
  const comparison = analyticsComparisonLabels[period];
  const hasPayments =
    data.revenue.current > 0 ||
    data.revenue.previous > 0 ||
    data.pending.payments > 0 ||
    data.conversion.started > 0;

  if (!hasPayments) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="Belum ada pembayaran pada periode ini"
        description="Pendapatan muncul setelah pembayaran kelas berbayar disetujui. Pastikan QRIS atau rekening bank sudah diatur."
        action={
          <Link
            href={`${root}/settings/payments`}
            className={buttonVariants({
              variant: "outline",
              className: "mt-4",
            })}
          >
            Atur pembayaran
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatStrip
        label="Ringkasan pendapatan"
        items={[
          {
            label: "Pendapatan",
            value: formatRupiahAmount(data.revenue.current),
            detail: (
              <ChangeLine
                change={countChange(
                  data.revenue.current,
                  data.revenue.previous,
                )}
                comparison={comparison}
              />
            ),
          },
          {
            label: "Pembayaran lunas",
            value: formatCount(data.payments.current),
            detail: (
              <ChangeLine
                change={countChange(
                  data.payments.current,
                  data.payments.previous,
                )}
                comparison={comparison}
              />
            ),
          },
          {
            label: "Rata-rata",
            value: formatRupiahAmount(Math.round(data.averagePayment.current)),
            detail: "per pembayaran",
          },
          {
            label: "Menunggu verifikasi",
            value: formatCount(data.pending.payments),
            attention: data.pending.payments > 0,
            detail:
              data.pending.payments > 0
                ? `${formatRupiahAmount(data.pending.amount)} saat ini`
                : "Tidak ada bukti yang menunggu",
          },
        ]}
      />

      <AnalyticsSection
        title="Pendapatan"
        description="Pembayaran yang disetujui, menurut tanggal persetujuan."
      >
        <TrendChart
          label="Grafik pendapatan per periode"
          data={data.series}
          granularity={granularity}
          format="rupiah"
          series={[{ key: "revenue", label: "Pendapatan" }]}
        />
      </AnalyticsSection>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AnalyticsSection
          title="Kelas dengan pendapatan terbesar"
          description="Buka kelas untuk melihat dan memverifikasi pembayarannya."
        >
          <RankedRows
            label="Pendapatan per kelas"
            empty="Belum ada pembayaran lunas pada periode ini."
            rows={data.cohorts.map((cohort) => ({
              key: cohort.cohortId,
              title: cohort.cohortName,
              subtitle: cohort.courseTitle,
              value: formatRupiahAmount(cohort.revenue),
              detail: `${formatCount(cohort.payments)} pembayaran`,
              share: data.revenue.current
                ? cohort.revenue / data.revenue.current
                : null,
              href: `${root}/courses/${cohort.courseId}/cohorts/${cohort.cohortId}?view=payments`,
            }))}
          />
        </AnalyticsSection>

        <div className="space-y-6">
          <AnalyticsSection
            title="Konversi checkout"
            description="Checkout yang dimulai pada periode ini dan akhirnya lunas."
          >
            <p className="text-3xl font-medium tracking-[-0.03em] tabular-nums">
              {formatPercent(data.conversion.rate)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatCount(data.conversion.paid)} dari{" "}
              {formatCount(data.conversion.started)} murid yang memulai checkout
              sudah membayar.
            </p>
          </AnalyticsSection>
          <AnalyticsSection title="Metode pembayaran">
            <RankedRows
              label="Pendapatan per metode"
              empty="Belum ada pembayaran lunas pada periode ini."
              rows={data.methods.map((method) => ({
                key: method.method,
                title: methodLabels[method.method],
                value: formatRupiahAmount(method.revenue),
                detail: `${formatCount(method.payments)} pembayaran`,
                share: data.revenue.current
                  ? method.revenue / data.revenue.current
                  : null,
              }))}
            />
          </AnalyticsSection>
        </div>
      </div>
    </div>
  );
}
