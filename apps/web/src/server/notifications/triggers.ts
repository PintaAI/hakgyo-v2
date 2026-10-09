import { after } from "next/server";

import { Prisma } from "../../../generated/prisma/client";
import { db } from "~/server/db";
import { notifyUsers } from "~/server/notifications/dispatch";
import {
  formatMeetingTime,
  formatRelativeDuration,
} from "~/server/notifications/format";

/**
 * Reminder windows used by the notifications cron. They are wider than the
 * cron interval (10 minutes, and GitHub schedules often run late) so a
 * delayed run still catches every event and meeting.
 */
export const EVENT_CLOSING_WINDOW_MS = 30 * 60_000;
export const MEETING_STARTING_WINDOW_MS = 60 * 60_000;

/**
 * Domain events that push to learners. Each trigger loads what it needs by
 * id, so routers call it after their write commits and never share its
 * transaction. Recipients are learners with an ACTIVE, unexpired enrollment.
 */

/**
 * Runs a notification task after the response when inside a Next.js request,
 * inline otherwise (MCP, scripts, tests). Failures are logged, never thrown:
 * the domain write already succeeded.
 */
export async function notifyInBackground(
  label: string,
  task: () => Promise<unknown>,
): Promise<void> {
  const run = () =>
    task().then(
      () => undefined,
      (error: unknown) => {
        console.error(`Failed to send notification: ${label}`, error);
      },
    );
  try {
    after(run);
  } catch {
    await run();
  }
}

function activeEnrollmentWhere(now: Date) {
  return {
    status: "ACTIVE" as const,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/** Learners with an active membership in the cohort. */
export async function activeCohortLearnerIds(cohortId: string, now: Date) {
  const rows = await db.cohortEnrollment.findMany({
    where: { cohortId, ...activeEnrollmentWhere(now) },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

const eventSelect = {
  id: true,
  title: true,
  type: true,
  organizationId: true,
  courseId: true,
  closesAt: true,
  course: { select: { title: true } },
} as const;

function eventLabel(type: string) {
  return type === "TRYOUT" ? "Tryout" : "Latihan";
}

/**
 * Valid participants who are still actively enrolled in a targeted class (optionally only the
 * given classes).
 */
async function eventRecipientIds(
  eventId: string,
  now: Date,
  cohortIds?: string[],
) {
  const rows = await db.$queryRaw<Array<{ userId: string }>>`
    SELECT DISTINCT participant."userId"
    FROM "AssessmentEventParticipant" AS participant
    JOIN "AssessmentEventCohort" AS target ON target."eventId" = participant."eventId"
    JOIN "CohortEnrollment" AS enrollment
      ON enrollment."cohortId" = target."cohortId"
      AND enrollment."userId" = participant."userId"
    WHERE participant."eventId" = ${eventId}
      AND participant."invalidatedAt" IS NULL
      AND enrollment."status" = 'ACTIVE'
      AND (enrollment."expiresAt" IS NULL OR enrollment."expiresAt" > ${now}::timestamp(3))
      ${cohortIds ? Prisma.sql`AND target."cohortId" IN (${Prisma.join(cohortIds)})` : Prisma.empty}
  `;
  return rows.map((row) => row.userId);
}

function eventLinks(eventId: string) {
  return {
    path: `/learn/assessments/${eventId}`,
    mobilePath: `/events/${eventId}`,
    tag: `event:${eventId}`,
  };
}

/** "Opened" push to the event's learners, or only to those of newly added classes. */
export async function notifyEventOpened(eventId: string, cohortIds?: string[]) {
  const now = new Date();
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: { ...eventSelect, status: true },
  });
  if (event?.status !== "OPEN") return;
  const closes = event.closesAt
    ? ` Ditutup dalam ${formatRelativeDuration(event.closesAt.getTime() - now.getTime())}.`
    : "";
  return notifyUsers(await eventRecipientIds(event.id, now, cohortIds), {
    type: "assessment-opened",
    title: `${eventLabel(event.type)} dibuka: ${event.title}`,
    body: `${event.course.title}.${closes} Kerjakan sekarang.`,
    organizationId: event.organizationId,
    data: { eventId: event.id },
    ...eventLinks(event.id),
  });
}

/** Only for events that were open: drafts never reached learners. */
export async function notifyEventCancelled(eventId: string, reason: string) {
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: eventSelect,
  });
  if (!event) return;
  return notifyUsers(await eventRecipientIds(event.id, new Date()), {
    type: "assessment-cancelled",
    title: `${eventLabel(event.type)} dibatalkan: ${event.title}`,
    body: `Alasan: ${reason}`,
    organizationId: event.organizationId,
    data: { eventId: event.id },
    ...eventLinks(event.id),
  });
}

export async function notifyParticipationInvalidated(
  eventId: string,
  userId: string,
  reason: string,
) {
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: eventSelect,
  });
  if (!event) return;
  return notifyUsers([userId], {
    type: "assessment-invalidated",
    title: `Hasil ${eventLabel(event.type).toLowerCase()} dibatalkan`,
    body: `Pengerjaan ${event.title} tidak dihitung. Alasan: ${reason}`,
    organizationId: event.organizationId,
    data: { eventId: event.id },
    ...eventLinks(event.id),
  });
}

/**
 * "Closes soon" nudge for participants who have not submitted. Claimed with
 * a conditional update so overlapping cron runs send it once.
 */
export async function notifyEventClosingSoon(eventId: string, now: Date) {
  const claimed = await db.assessmentEvent.updateMany({
    where: { id: eventId, status: "OPEN", closingReminderSentAt: null },
    data: { closingReminderSentAt: now },
  });
  if (claimed.count !== 1) return;
  const event = await db.assessmentEvent.findUniqueOrThrow({
    where: { id: eventId },
    select: eventSelect,
  });
  if (!event.closesAt) return;
  const [recipients, submitted] = await Promise.all([
    eventRecipientIds(event.id, now),
    db.assessmentAttempt.findMany({
      where: { assessmentEventId: eventId, status: { not: "IN_PROGRESS" } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);
  const done = new Set(submitted.map((attempt) => attempt.userId));
  return notifyUsers(
    recipients.filter((userId) => !done.has(userId)),
    {
      type: "assessment-closing",
      title: `${eventLabel(event.type)} segera ditutup: ${event.title}`,
      body: `Ditutup dalam ${formatRelativeDuration(event.closesAt.getTime() - now.getTime())}. Kirim jawabanmu sebelum waktu habis.`,
      organizationId: event.organizationId,
      data: { eventId: event.id },
      ...eventLinks(event.id),
    },
  );
}

/** Only standalone assessments: event results follow the event's policy. */
export async function notifyAttemptGraded(attemptId: string) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      organizationId: true,
      courseItemId: true,
      assessmentEventId: true,
      assessment: { select: { title: true } },
      courseItem: { select: { module: { select: { courseId: true } } } },
    },
  });
  if (attempt?.status !== "GRADED" || attempt.assessmentEventId) return;
  const courseId = attempt.courseItem.module.courseId;
  const attemptPath = `/${courseId}/items/${attempt.courseItemId}/attempts/${attempt.id}`;
  return notifyUsers([attempt.userId], {
    type: "assessment-graded",
    title: "Tugas sudah dinilai",
    body: `${attempt.assessment.title} selesai dinilai. Lihat hasil dan masukan dari pengajar.`,
    organizationId: attempt.organizationId,
    data: { attemptId: attempt.id },
    path: `/learn${attemptPath}`,
    mobilePath: `/courses${attemptPath}`,
    tag: `attempt:${attempt.id}`,
  });
}

type MeetingSnapshot = {
  id: string;
  cohortId: string;
  organizationId: string;
  title: string;
  startsAt: Date;
  timezone: string;
};

async function meetingContext(meeting: MeetingSnapshot, now: Date) {
  const [recipients, cohort] = await Promise.all([
    activeCohortLearnerIds(meeting.cohortId, now),
    db.cohort.findUnique({
      where: { id: meeting.cohortId },
      select: { name: true, courseId: true },
    }),
  ]);
  return {
    recipients,
    content: {
      organizationId: meeting.organizationId,
      data: { meetingId: meeting.id, cohortId: meeting.cohortId },
      path: cohort ? `/learn/${cohort.courseId}` : "/learn",
      // The Belajar tab focuses the cohort card that lists its meetings.
      mobilePath: `/learn?cohortId=${meeting.cohortId}`,
      tag: `meeting:${meeting.id}`,
    },
    cohortName: cohort?.name ?? "kelas",
    when: formatMeetingTime(meeting.startsAt, meeting.timezone),
  };
}

/**
 * A meeting scheduled or moved into the reminder window already announced
 * its time; skip the "starts soon" push that would follow minutes later.
 */
async function claimReminderIfImminent(meeting: MeetingSnapshot, now: Date) {
  if (meeting.startsAt.getTime() - now.getTime() > MEETING_STARTING_WINDOW_MS)
    return;
  await db.cohortMeeting.updateMany({
    where: { id: meeting.id, reminderSentAt: null },
    data: { reminderSentAt: now },
  });
}

export async function notifyMeetingScheduled(meeting: MeetingSnapshot) {
  const now = new Date();
  await claimReminderIfImminent(meeting, now);
  const { recipients, content, cohortName, when } = await meetingContext(
    meeting,
    now,
  );
  return notifyUsers(recipients, {
    ...content,
    type: "cohort-meeting",
    title: `Pertemuan baru: ${meeting.title}`,
    body: `${cohortName} · ${when}`,
  });
}

export async function notifyMeetingUpdated(meeting: MeetingSnapshot) {
  const now = new Date();
  await claimReminderIfImminent(meeting, now);
  const { recipients, content, cohortName, when } = await meetingContext(
    meeting,
    now,
  );
  return notifyUsers(recipients, {
    ...content,
    type: "cohort-meeting",
    title: `Pertemuan diubah: ${meeting.title}`,
    body: `${cohortName} · sekarang ${when}`,
  });
}

/** Takes a snapshot because the row is already deleted. */
export async function notifyMeetingCancelled(meeting: MeetingSnapshot) {
  const { recipients, content, cohortName, when } = await meetingContext(
    meeting,
    new Date(),
  );
  return notifyUsers(recipients, {
    ...content,
    type: "cohort-meeting",
    title: `Pertemuan dibatalkan: ${meeting.title}`,
    body: `${cohortName} · ${when} tidak jadi dilaksanakan.`,
  });
}

/** Claimed like the event reminder; cleared when the meeting is moved. */
export async function notifyMeetingStartingSoon(meetingId: string, now: Date) {
  const claimed = await db.cohortMeeting.updateMany({
    where: { id: meetingId, status: "SCHEDULED", reminderSentAt: null },
    data: { reminderSentAt: now },
  });
  if (claimed.count !== 1) return;
  const meeting = await db.cohortMeeting.findUniqueOrThrow({
    where: { id: meetingId },
  });
  const { recipients, content, cohortName } = await meetingContext(
    meeting,
    now,
  );
  return notifyUsers(recipients, {
    ...content,
    type: "cohort-meeting",
    title: `Segera dimulai: ${meeting.title}`,
    body: `${cohortName} · mulai dalam ${formatRelativeDuration(meeting.startsAt.getTime() - now.getTime())}.`,
  });
}

export async function notifyEnrollmentAdded(userId: string, cohortId: string) {
  const cohort = await db.cohort.findUnique({
    where: { id: cohortId },
    select: {
      name: true,
      organizationId: true,
      courseId: true,
      defaultForCourseId: true,
      course: { select: { title: true } },
    },
  });
  if (!cohort) return;
  return notifyUsers([userId], {
    type: "enrollment",
    title: `Kamu terdaftar di ${cohort.course.title}`,
    body: cohort.defaultForCourseId
      ? "Kurikulum ini sekarang bisa kamu pelajari."
      : `Kamu bergabung dengan kelas ${cohort.name}.`,
    organizationId: cohort.organizationId,
    data: { cohortId, courseId: cohort.courseId },
    path: `/learn/${cohort.courseId}`,
    mobilePath: `/courses/${cohort.courseId}`,
    tag: `enrollment:${cohortId}`,
  });
}

/** The learner lost access, so there is no screen to open. */
export async function notifyEnrollmentRemoved(
  userId: string,
  cohortId: string,
) {
  const cohort = await db.cohort.findUnique({
    where: { id: cohortId },
    select: {
      name: true,
      organizationId: true,
      courseId: true,
      defaultForCourseId: true,
      course: { select: { title: true } },
    },
  });
  if (!cohort) return;
  return notifyUsers([userId], {
    type: "enrollment",
    title: `Akses ${cohort.course.title} berakhir`,
    body: cohort.defaultForCourseId
      ? "Pengelola kurikulum menghapus akses belajar mandirimu."
      : `Kamu tidak lagi terdaftar di kelas ${cohort.name}.`,
    organizationId: cohort.organizationId,
    data: { cohortId, courseId: cohort.courseId },
    path: "/learn",
    tag: `enrollment:${cohortId}`,
  });
}

const paymentNotificationSelect = {
  id: true,
  reference: true,
  amount: true,
  userId: true,
  reviewNote: true,
  cohortId: true,
  organizationId: true,
  user: { select: { name: true } },
  organization: { select: { slug: true } },
  cohort: {
    select: {
      name: true,
      courseId: true,
      course: { select: { title: true } },
    },
  },
} as const;

function formatPaymentAmount(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Staff who can verify the payment: cohort staff and organization managers. */
export async function notifyPaymentSubmitted(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: paymentNotificationSelect,
  });
  if (!payment) return;
  const reviewers = await db.organizationMember.findMany({
    where: {
      organizationId: payment.organizationId,
      userId: { not: payment.userId },
      OR: [
        { role: { in: ["OWNER", "ADMIN"] } },
        { cohortStaffMemberships: { some: { cohortId: payment.cohortId } } },
      ],
    },
    select: { userId: true },
  });
  if (reviewers.length === 0) return;
  return notifyUsers(
    reviewers.map(({ userId }) => userId),
    {
      type: "payment-review",
      title: "Bukti pembayaran baru",
      body: `${payment.user.name} · ${payment.cohort.name} · ${formatPaymentAmount(payment.amount)}`,
      organizationId: payment.organizationId,
      data: { paymentId: payment.id, cohortId: payment.cohortId },
      path: `/workspace/${payment.organization.slug}/courses/${payment.cohort.courseId}/cohorts/${payment.cohortId}?view=payments`,
      tag: `payment-review:${payment.id}`,
      webOnly: true,
    },
  );
}

export async function notifyPaymentApproved(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: paymentNotificationSelect,
  });
  if (!payment) return;
  return notifyUsers([payment.userId], {
    type: "payment",
    title: "Pembayaran dikonfirmasi",
    body: `Kamu sekarang terdaftar di ${payment.cohort.name} (${payment.cohort.course.title}).`,
    organizationId: payment.organizationId,
    data: { paymentId: payment.id, courseId: payment.cohort.courseId },
    path: `/learn/${payment.cohort.courseId}`,
    mobilePath: `/courses/${payment.cohort.courseId}`,
    tag: `payment:${payment.id}`,
  });
}

export async function notifyPaymentRejected(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: paymentNotificationSelect,
  });
  if (!payment) return;
  return notifyUsers([payment.userId], {
    type: "payment",
    title: `Pembayaran ${payment.reference} ditolak`,
    body:
      payment.reviewNote ??
      `Periksa kembali pembayaran untuk ${payment.cohort.name}.`,
    organizationId: payment.organizationId,
    data: { paymentId: payment.id },
    path: `/learn/payments/${payment.id}`,
    tag: `payment:${payment.id}`,
    webOnly: true,
  });
}
