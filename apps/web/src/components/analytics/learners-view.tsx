import {
  AnalyticsSection,
  ChangeLine,
  RankedRows,
} from "~/components/analytics/analytics-parts";
import { TrendChart } from "~/components/analytics/trend-chart";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { StatStrip } from "~/components/ui/stat-strip";
import {
  countChange,
  formatCount,
  formatPercent,
  formatShortDate,
} from "~/lib/analytics/format";
import {
  analyticsComparisonLabels,
  type AnalyticsGranularity,
  type AnalyticsPeriod,
} from "~/lib/analytics/period";
import type { LearnerAnalytics } from "~/server/analytics/learners";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Enrollment sources grouped the way staff think about them. */
const sourceGroups = [
  { key: "purchase", label: "Pembelian", sources: ["PURCHASE"] },
  { key: "invite", label: "Undangan", sources: ["INVITE"] },
  { key: "manual", label: "Ditambahkan staf", sources: ["MANUAL"] },
  { key: "open", label: "Daftar sendiri", sources: ["OPEN"] },
  { key: "other", label: "Lainnya", sources: ["COHORT", "FOUNDATION"] },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function LearnerAvatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  return (
    <Avatar className="size-8">
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function LearnersView({
  data,
  period,
  granularity,
  root,
  scoped,
  now,
}: {
  data: LearnerAnalytics;
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  root: string;
  /** The viewer only sees the classes they teach. */
  scoped: boolean;
  now: Date;
}) {
  const comparison = analyticsComparisonLabels[period];
  const enrollmentSeries = data.series.map((row) => ({
    bucket: row.bucket,
    ...Object.fromEntries(
      sourceGroups.map((group) => [
        group.key,
        group.sources.reduce((sum, source) => sum + row.enrollments[source], 0),
      ]),
    ),
  }));
  // Only show sources that occur in the period, so the legend stays short.
  const usedSources = sourceGroups.filter((group) =>
    enrollmentSeries.some(
      (row) => (row as Record<string, number | string>)[group.key] !== 0,
    ),
  );

  return (
    <div className="space-y-6">
      <StatStrip
        label="Ringkasan murid"
        items={[
          {
            label: "Murid terdaftar",
            value: formatCount(data.learners),
            detail: scoped ? "di kelas yang Anda pegang" : "aktif dan lulus",
          },
          {
            label: "Murid aktif",
            value: formatCount(data.active.current),
            detail: (
              <ChangeLine
                change={countChange(data.active.current, data.active.previous)}
                comparison={comparison}
              />
            ),
          },
          {
            label: "Pendaftaran baru",
            value: formatCount(data.newEnrollments.current),
            detail: (
              <ChangeLine
                change={countChange(
                  data.newEnrollments.current,
                  data.newEnrollments.previous,
                )}
                comparison={comparison}
              />
            ),
          },
          {
            label: `Tidak aktif ${data.inactive.days}+ hari`,
            value: formatCount(data.inactive.total),
            attention: data.inactive.total > 0,
            detail: "perlu disapa",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsSection
          title="Murid aktif"
          description={`${formatPercent(data.active.rate)} murid belajar pada periode ini.`}
        >
          <TrendChart
            label="Grafik murid aktif per periode"
            data={data.series.map((row) => ({
              bucket: row.bucket,
              active: row.active,
            }))}
            granularity={granularity}
            format="count"
            series={[{ key: "active", label: "Murid aktif" }]}
          />
        </AnalyticsSection>
        <AnalyticsSection
          title="Pendaftaran baru"
          description="Menurut cara murid bergabung ke kelas."
        >
          {usedSources.length ? (
            <TrendChart
              label="Grafik pendaftaran baru per sumber"
              kind="bar"
              data={enrollmentSeries}
              granularity={granularity}
              format="count"
              series={usedSources.map((group, index) => ({
                key: group.key,
                label: group.label,
                color:
                  index === 0 ? "var(--primary)" : `var(--chart-${index + 1})`,
              }))}
            />
          ) : (
            <p className="text-muted-foreground border-border flex h-56 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm sm:h-64">
              Belum ada pendaftaran baru pada periode ini.
            </p>
          )}
        </AnalyticsSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AnalyticsSection
          title={`Tidak aktif lebih dari ${data.inactive.days} hari`}
          description={
            data.inactive.total > data.inactive.learners.length
              ? `${formatCount(data.inactive.learners.length)} dari ${formatCount(data.inactive.total)} murid, yang paling lama lebih dulu.`
              : "Murid aktif di kelas yang belum belajar lagi, yang paling lama lebih dulu."
          }
        >
          <RankedRows
            label="Murid tidak aktif"
            empty="Semua murid masih belajar dalam 30 hari terakhir."
            rows={data.inactive.learners.map((learner) => {
              const since = learner.lastActiveAt ?? learner.enrolledAt;
              const days = Math.floor(
                (now.getTime() - since.getTime()) / DAY_MS,
              );
              return {
                key: `${learner.userId}:${learner.cohortId}`,
                leading: (
                  <LearnerAvatar name={learner.name} image={learner.image} />
                ),
                title: learner.name,
                subtitle: learner.selfPaced
                  ? `Belajar mandiri · ${learner.courseTitle}`
                  : `${learner.cohortName} · ${learner.courseTitle}`,
                value: `${formatCount(days)} hari`,
                detail: learner.lastActiveAt
                  ? `aktif ${formatShortDate(learner.lastActiveAt)}`
                  : "belum pernah aktif",
                warn: true,
                href: learner.selfPaced
                  ? `${root}/courses/${learner.courseId}?view=learners`
                  : `${root}/courses/${learner.courseId}/cohorts/${learner.cohortId}?view=learners`,
              };
            })}
          />
        </AnalyticsSection>

        <AnalyticsSection
          title="XP tertinggi"
          description="Murid paling rajin pada periode ini."
        >
          <RankedRows
            label="Murid dengan XP tertinggi"
            empty="Belum ada aktivitas pada periode ini."
            rows={data.topXp.map((learner, index) => ({
              key: learner.userId,
              leading: (
                <span className="text-muted-foreground w-4 text-center font-mono text-xs tabular-nums">
                  {index + 1}
                </span>
              ),
              title: learner.name,
              subtitle: `${formatCount(learner.activities)} aktivitas`,
              value: `${formatCount(learner.xp)} XP`,
            }))}
          />
        </AnalyticsSection>
      </div>

      <AnalyticsSection
        title="Keaktifan per kelas"
        description="Murid yang belajar pada periode ini dibanding murid di kelas."
      >
        <RankedRows
          label="Keaktifan per kelas"
          empty="Belum ada murid di kelas."
          rows={data.cohorts.map((cohort) => {
            const share = cohort.learners
              ? cohort.active / cohort.learners
              : null;
            return {
              key: cohort.cohortId,
              title: cohort.selfPaced ? "Belajar mandiri" : cohort.cohortName,
              subtitle:
                cohort.status === "COMPLETED"
                  ? `Kelas selesai · ${cohort.courseTitle}`
                  : cohort.courseTitle,
              value: `${formatCount(cohort.active)}/${formatCount(cohort.learners)} aktif`,
              detail:
                cohort.newEnrollments > 0
                  ? `+${formatCount(cohort.newEnrollments)} pendaftaran baru`
                  : undefined,
              share,
              // Finished classes are expected to go quiet.
              warn:
                cohort.status !== "COMPLETED" && share !== null && share < 0.5,
              href: cohort.selfPaced
                ? `${root}/courses/${cohort.courseId}?view=learners`
                : `${root}/courses/${cohort.courseId}/cohorts/${cohort.cohortId}?view=learners`,
            };
          })}
        />
      </AnalyticsSection>
    </div>
  );
}
