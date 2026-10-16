import { Prisma } from "../../../generated/prisma/client";
import type { PaymentMethod } from "../../../generated/prisma/enums";
import { fillBuckets, type AnalyticsRange } from "~/lib/analytics/period";
import { localBucket, ratio, toNumber } from "./sql";
import type { AnalyticsDb } from "./scope";

/**
 * Revenue is the sum of PAID payments by approval time (`paidAt`). Reverting
 * an approval clears `paidAt`, so a reverted payment drops out of every
 * period, including past ones. Payments are always IDR; free cohorts create
 * no payment rows and therefore do not appear here.
 */
export async function getRevenueAnalytics(
  db: AnalyticsDb,
  input: { organizationId: string; range: AnalyticsRange },
) {
  const { organizationId, range } = input;
  const paidInPeriod = Prisma.sql`p."paidAt" >= ${range.start} AND p."paidAt" < ${range.end}`;

  const [totals, series, pending, conversion, cohorts, methods] =
    await Promise.all([
      db.$queryRaw<
        Array<{
          revenue: number | null;
          payments: number;
          previousRevenue: number | null;
          previousPayments: number;
        }>
      >`
        SELECT
          SUM(p."amount") FILTER (WHERE p."paidAt" >= ${range.start})::float8 AS "revenue",
          COUNT(*) FILTER (WHERE p."paidAt" >= ${range.start})::int AS "payments",
          SUM(p."amount") FILTER (WHERE p."paidAt" < ${range.previousEnd})::float8 AS "previousRevenue",
          COUNT(*) FILTER (WHERE p."paidAt" < ${range.previousEnd})::int AS "previousPayments"
        FROM "Payment" p
        WHERE p."organizationId" = ${organizationId}
          AND p."status" = 'PAID'
          AND p."paidAt" >= ${range.previousStart}
          AND p."paidAt" < ${range.end}
          AND (p."paidAt" >= ${range.start} OR p."paidAt" < ${range.previousEnd})
      `,
      db.$queryRaw<
        Array<{ bucket: string; revenue: number; payments: number }>
      >`
        SELECT
          ${localBucket(Prisma.sql`p."paidAt"`, range.granularity)} AS "bucket",
          SUM(p."amount")::float8 AS "revenue",
          COUNT(*)::int AS "payments"
        FROM "Payment" p
        WHERE p."organizationId" = ${organizationId}
          AND p."status" = 'PAID'
          AND ${paidInPeriod}
        GROUP BY 1
      `,
      // A snapshot, not tied to the period: proofs waiting for staff now.
      db.$queryRaw<Array<{ payments: number; amount: number | null }>>`
        SELECT COUNT(*)::int AS "payments", SUM(p."amount")::float8 AS "amount"
        FROM "Payment" p
        WHERE p."organizationId" = ${organizationId} AND p."status" = 'SUBMITTED'
      `,
      // Checkouts started in the period that were paid, counting a learner's
      // retries for the same class once.
      db.$queryRaw<Array<{ started: number; paid: number }>>`
        SELECT
          COUNT(DISTINCT (p."userId", p."cohortId"))::int AS "started",
          COUNT(DISTINCT (p."userId", p."cohortId")) FILTER (WHERE p."status" = 'PAID')::int AS "paid"
        FROM "Payment" p
        WHERE p."organizationId" = ${organizationId}
          AND p."createdAt" >= ${range.start}
          AND p."createdAt" < ${range.end}
      `,
      db.$queryRaw<
        Array<{
          cohortId: string;
          cohortName: string;
          courseId: string;
          courseTitle: string;
          revenue: number;
          payments: number;
        }>
      >`
        SELECT
          c."id" AS "cohortId",
          c."name" AS "cohortName",
          course."id" AS "courseId",
          course."title" AS "courseTitle",
          SUM(p."amount")::float8 AS "revenue",
          COUNT(*)::int AS "payments"
        FROM "Payment" p
        JOIN "Cohort" c ON c."id" = p."cohortId"
        JOIN "Course" course ON course."id" = c."courseId"
        WHERE p."organizationId" = ${organizationId}
          AND p."status" = 'PAID'
          AND ${paidInPeriod}
        GROUP BY c."id", course."id"
        ORDER BY "revenue" DESC, c."name" ASC
        LIMIT 8
      `,
      db.$queryRaw<
        Array<{ method: PaymentMethod; revenue: number; payments: number }>
      >`
        SELECT
          p."method"::text AS "method",
          SUM(p."amount")::float8 AS "revenue",
          COUNT(*)::int AS "payments"
        FROM "Payment" p
        WHERE p."organizationId" = ${organizationId}
          AND p."status" = 'PAID'
          AND ${paidInPeriod}
        GROUP BY 1
        ORDER BY "revenue" DESC
      `,
    ]);

  const total = totals[0];
  const revenue = toNumber(total?.revenue);
  const payments = toNumber(total?.payments);
  const previousRevenue = toNumber(total?.previousRevenue);
  const previousPayments = toNumber(total?.previousPayments);
  const started = toNumber(conversion[0]?.started);
  const converted = toNumber(conversion[0]?.paid);

  return {
    revenue: { current: revenue, previous: previousRevenue },
    payments: { current: payments, previous: previousPayments },
    averagePayment: {
      current: payments ? revenue / payments : 0,
      previous: previousPayments ? previousRevenue / previousPayments : 0,
    },
    pending: {
      payments: toNumber(pending[0]?.payments),
      amount: toNumber(pending[0]?.amount),
    },
    conversion: {
      started,
      paid: converted,
      rate: ratio(converted, started),
    },
    series: fillBuckets(range.buckets, series, (row) => ({
      revenue: toNumber(row?.revenue),
      payments: toNumber(row?.payments),
    })),
    cohorts: cohorts.map((row) => ({
      ...row,
      revenue: toNumber(row.revenue),
      payments: toNumber(row.payments),
    })),
    methods: methods.map((row) => ({
      ...row,
      revenue: toNumber(row.revenue),
      payments: toNumber(row.payments),
    })),
  };
}

export type RevenueAnalytics = Awaited<ReturnType<typeof getRevenueAnalytics>>;
