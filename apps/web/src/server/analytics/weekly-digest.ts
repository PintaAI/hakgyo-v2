import { resolveAnalyticsRange } from "~/lib/analytics/period";
import {
  countChange,
  formatCount,
  formatPercent,
  formatRupiahAmount,
} from "~/lib/analytics/format";
import { notifyUsers } from "~/server/notifications/dispatch";
import { resolveAnalyticsScope, type AnalyticsDb } from "./scope";
import { getAnalyticsSummary, type AnalyticsSummary } from "./summary";

export const WEEKLY_DIGEST_TYPE = "analytics-weekly";
/** A digest is not repeated for the same organization within this window. */
const RESEND_AFTER_MS = 6 * 24 * 60 * 60 * 1000;

function withChange(text: string, change: ReturnType<typeof countChange>) {
  return change && change.direction !== "flat"
    ? `${text} (${change.text})`
    : text;
}

/** The digest's one-paragraph body; null when there is nothing to report. */
export function buildWeeklyDigestBody(summary: AnalyticsSummary) {
  if (summary.learners === 0) return null;
  const parts = [
    withChange(
      `${formatCount(summary.activeLearners.current)} dari ${formatCount(summary.learners)} murid aktif`,
      countChange(
        summary.activeLearners.current,
        summary.activeLearners.previous,
      ),
    ),
  ];
  if (summary.averageScore.current !== null) {
    parts.push(
      `rata-rata nilai ${formatPercent(summary.averageScore.current)}`,
    );
  }
  if (summary.revenue && summary.revenue.current > 0) {
    parts.push(
      withChange(
        `pendapatan ${formatRupiahAmount(summary.revenue.current)}`,
        countChange(summary.revenue.current, summary.revenue.previous),
      ),
    );
  }
  return `7 hari terakhir: ${parts.join(", ")}.`;
}

/**
 * Sends each owner, admin and teacher a summary of the past seven days for
 * every organization where they have learners in view. Runs weekly from the
 * analytics-digest cron; a member already sent a digest for the organization
 * in the last six days is skipped, so a retried run does not repeat it.
 */
export async function sendWeeklyAnalyticsDigests(
  db: AnalyticsDb,
  options: {
    now?: Date;
    /** Limits the run to one organization, for manual testing. */
    organizationId?: string;
  } = {},
) {
  const now = options.now ?? new Date();
  const range = resolveAnalyticsRange("7h", now);
  const members = await db.organizationMember.findMany({
    where: {
      organizationId: options.organizationId,
      user: { deletedAt: null, suspendedAt: null },
      organization: {
        courses: { some: { cohorts: { some: { enrollments: { some: {} } } } } },
      },
    },
    select: {
      userId: true,
      organizationId: true,
      organization: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const recent = await db.notification.findMany({
    where: {
      type: WEEKLY_DIGEST_TYPE,
      createdAt: { gte: new Date(now.getTime() - RESEND_AFTER_MS) },
    },
    select: { userId: true, organizationId: true },
  });
  const alreadySent = new Set(
    recent.map((row) => `${row.userId}:${row.organizationId}`),
  );

  let sent = 0;
  let skipped = 0;
  for (const member of members) {
    if (alreadySent.has(`${member.userId}:${member.organizationId}`)) {
      skipped += 1;
      continue;
    }
    const scope = await resolveAnalyticsScope(db, {
      organizationId: member.organizationId,
      userId: member.userId,
    });
    const summary = await getAnalyticsSummary(db, { scope, range });
    const body = buildWeeklyDigestBody(summary);
    if (!body) {
      skipped += 1;
      continue;
    }
    await notifyUsers([member.userId], {
      type: WEEKLY_DIGEST_TYPE,
      title: `Ringkasan mingguan · ${member.organization.name}`,
      body,
      path: `/workspace/${member.organization.slug}/analitik/performa?periode=7h`,
      organizationId: member.organizationId,
      tag: `${WEEKLY_DIGEST_TYPE}:${member.organizationId}`,
      data: { organizationId: member.organizationId },
      webOnly: true,
    });
    sent += 1;
  }
  return { members: members.length, sent, skipped };
}
