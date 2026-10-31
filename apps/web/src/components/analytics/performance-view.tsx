import {
  AnalyticsSection,
  ChangeLine,
  RankedRows,
} from "~/components/analytics/analytics-parts";
import { TrendChart } from "~/components/analytics/trend-chart";
import { StatStrip } from "~/components/ui/stat-strip";
import {
  formatCount,
  formatHours,
  formatPercent,
  ratioChange,
} from "~/lib/analytics/format";
import {
  analyticsComparisonLabels,
  type AnalyticsGranularity,
  type AnalyticsPeriod,
} from "~/lib/analytics/period";
import type { PerformanceAnalytics } from "~/server/analytics/performance";

/** Below this average a result is flagged. */
const WEAK_SCORE = 0.7;
const eventTypeLabels = {
  QUICK_ASSESSMENT: "Latihan",
  TRYOUT: "Tryout",
} as const;

export function PerformanceView({
  data,
  period,
  granularity,
  root,
}: {
  data: PerformanceAnalytics;
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  root: string;
}) {
  const comparison = analyticsComparisonLabels[period];

  return (
    <div className="space-y-6">
      <StatStrip
        label="Ringkasan performa"
        items={[
          {
            label: "Rata-rata nilai",
            value: formatPercent(data.averageScore.current),
            detail: (
              <ChangeLine
                change={ratioChange(
                  data.averageScore.current,
                  data.averageScore.previous,
                )}
                comparison={comparison}
              />
            ),
          },
          {
            label: "Tingkat lulus",
            value: formatPercent(data.passRate.current),
            detail: (
              <ChangeLine
                change={ratioChange(
                  data.passRate.current,
                  data.passRate.previous,
                )}
                comparison={comparison}
              />
            ),
          },
          {
            label: "Penyelesaian materi",
            value: formatPercent(data.completion.rate),
            detail: `${formatCount(data.completion.completed)} dari ${formatCount(data.completion.items)} item selesai`,
          },
          {
            label: "Perlu review",
            value: formatCount(data.review.waiting),
            href: `${root}/reviews`,
            attention: data.review.waiting > 0,
            detail: data.review.reviewed
              ? `Review rata-rata ${formatHours(data.review.medianHours)}`
              : "Belum ada review pada periode ini",
          },
        ]}
      />

      <AnalyticsSection
        title="Rata-rata nilai tugas"
        description={`Nilai terbaik tiap murid per tugas kurikulum · ${formatCount(data.assessed.current)} hasil pada periode ini.`}
      >
        <TrendChart
          label="Grafik rata-rata nilai tugas per periode"
          data={data.series.map((row) => ({
            bucket: row.bucket,
            averageScore: row.averageScore,
          }))}
          granularity={granularity}
          format="percent"
          series={[{ key: "averageScore", label: "Rata-rata nilai" }]}
        />
      </AnalyticsSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsSection
          title="Tugas paling sulit"
          description="Rata-rata nilai terendah, minimal tiga murid."
        >
          <RankedRows
            label="Tugas dengan nilai terendah"
            empty="Belum cukup hasil tugas pada periode ini."
            rows={data.hardest.map((item) => ({
              key: item.courseItemId,
              title: item.title,
              subtitle: item.courseTitle,
              value: formatPercent(item.averageScore),
              detail:
                item.passRate === null
                  ? `${formatCount(item.learners)} murid`
                  : `lulus ${formatPercent(item.passRate)} · ${formatCount(item.learners)} murid`,
              share: item.averageScore,
              warn: item.averageScore < WEAK_SCORE,
              href: `${root}/courses/${item.courseId}?view=reviews`,
            }))}
          />
        </AnalyticsSection>

        <AnalyticsSection
          title="Perbandingan kelas"
          description="Rata-rata nilai pada periode ini dan penyelesaian materi saat ini."
        >
          <RankedRows
            label="Performa per kelas"
            empty="Belum ada murid di kelas."
            rows={data.cohorts.map((cohort) => ({
              key: cohort.cohortId,
              title: cohort.cohortName,
              subtitle: cohort.courseTitle,
              value:
                cohort.averageScore === null
                  ? "—"
                  : formatPercent(cohort.averageScore),
              detail: `penyelesaian ${formatPercent(cohort.completionRate)}`,
              // The bar is completion; the score alone decides the warning.
              share: cohort.completionRate,
              warnShare: false,
              warn:
                cohort.averageScore !== null &&
                cohort.averageScore < WEAK_SCORE,
            }))}
          />
        </AnalyticsSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsSection
          title="Penyelesaian per kurikulum"
          description="Item terbit yang sudah diselesaikan murid aktif dan lulus."
        >
          <RankedRows
            label="Penyelesaian per kurikulum"
            empty="Belum ada murid di kurikulum."
            rows={data.courses.map((course) => ({
              key: course.courseId,
              title: course.courseTitle,
              subtitle: `${formatCount(course.finished)} dari ${formatCount(course.learners)} murid menuntaskan semua item`,
              value: formatPercent(course.completionRate),
              share: course.completionRate,
              href: `${root}/courses/${course.courseId}?view=cohorts`,
            }))}
          />
        </AnalyticsSection>

        <AnalyticsSection
          title="Latihan & tryout"
          description={
            data.events.items.length
              ? `Rata-rata ${formatPercent(data.events.averageScore)} dari ${formatCount(data.events.participants)} peserta. Dihitung terpisah dari tugas kurikulum.`
              : "Dihitung terpisah dari tugas kurikulum."
          }
        >
          <RankedRows
            label="Hasil latihan dan tryout"
            empty="Belum ada latihan atau tryout yang dinilai pada periode ini."
            rows={data.events.items.map((event) => ({
              key: event.eventId,
              title: event.title,
              subtitle: `${eventTypeLabels[event.type]} · ${event.courseTitle}`,
              value: formatPercent(event.averageScore),
              detail: `${formatCount(event.participants)} peserta · tertinggi ${formatPercent(event.topScore)}`,
              share: event.averageScore,
              warn: event.averageScore < WEAK_SCORE,
              href: `${root}/courses/${event.courseId}?view=tryouts`,
            }))}
          />
        </AnalyticsSection>
      </div>
    </div>
  );
}
