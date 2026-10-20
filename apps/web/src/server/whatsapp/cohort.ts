import "server-only";

import { TRPCError } from "@trpc/server";

import { Prisma } from "../../../generated/prisma/client";
import { env } from "~/env";
import { db } from "~/server/db";
import { isWhatsappEnabled } from "~/server/whatsapp/config";
import {
  autoCreateGroupKey,
  createGroupKey,
  eventScheduledKey,
  eventScheduledPrefix,
  meetingReminderKey,
  meetingReminderPrefix,
} from "~/server/whatsapp/keys";
import {
  eventScheduledText,
  meetingReminderText,
} from "~/server/whatsapp/messages";
import {
  cancelWhatsappOutbox,
  enqueueWhatsapp,
  loadActiveConnection,
  runOutboxRowNow,
} from "~/server/whatsapp/outbox";
import { normalizeWhatsappNumber } from "~/lib/whatsapp";

/**
 * Cohort-facing WhatsApp work: the cohort's group and the messages Hakgyo
 * sends to it. Message triggers only queue outbox rows (see outbox.ts); they
 * never call WhatsApp inside a domain write and never throw at their callers.
 */

/** What the cohort workspace shows in its WhatsApp section. */
export async function getCohortWhatsappStatus(cohortId: string) {
  const cohort = await db.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: {
      organizationId: true,
      whatsappGroupJid: true,
      whatsappGroupUrl: true,
      whatsappGroupCreatedAt: true,
    },
  });
  if (!isWhatsappEnabled()) {
    return { enabled: false as const };
  }
  const [connection, pendingCreate, lastCreate] = await Promise.all([
    db.whatsappConnection.findUnique({
      where: { organizationId: cohort.organizationId },
      select: { status: true, initialParticipantPhone: true },
    }),
    db.whatsappOutbox.findFirst({
      where: {
        cohortId,
        kind: "CREATE_GROUP",
        status: { in: ["PENDING", "SENDING"] },
      },
      select: { id: true, sendAfter: true },
    }),
    db.whatsappOutbox.findFirst({
      where: { cohortId, kind: "CREATE_GROUP" },
      orderBy: { createdAt: "desc" },
      select: { status: true, lastError: true },
    }),
  ]);
  return {
    enabled: true as const,
    connectionStatus: connection?.status ?? null,
    initialParticipantPhone: connection?.initialParticipantPhone ?? null,
    linked: cohort.whatsappGroupJid !== null,
    groupCreatedAt: cohort.whatsappGroupCreatedAt,
    pendingCreate: pendingCreate !== null,
    lastCreateError:
      lastCreate?.status === "FAILED" ? lastCreate.lastError : null,
  };
}

/**
 * Staff asked to create the cohort's group: queue it and run it right away
 * when the number's hourly budget allows. A second click while one request
 * is queued collides on its dedupe key.
 */
export async function requestCohortGroup(input: {
  cohortId: string;
  participant?: string | null;
}) {
  const cohort = await db.cohort.findUniqueOrThrow({
    where: { id: input.cohortId },
    select: {
      organizationId: true,
      whatsappGroupJid: true,
      defaultForCourseId: true,
    },
  });
  if (cohort.defaultForCourseId) throw new TRPCError({ code: "NOT_FOUND" });
  if (cohort.whatsappGroupJid) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Kelas ini sudah punya grup WhatsApp dari Hakgyo.",
    });
  }
  const connection = isWhatsappEnabled()
    ? await loadActiveConnection(cohort.organizationId)
    : null;
  if (!connection) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Hubungkan nomor WhatsApp organisasi terlebih dahulu.",
    });
  }
  const participant = input.participant?.trim()
    ? normalizeWhatsappNumber(input.participant)
    : connection.initialParticipantPhone;
  if (input.participant?.trim() && !participant) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nomor peserta awal tidak valid.",
    });
  }
  if (!participant) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "WhatsApp membutuhkan satu peserta selain nomor organisasi. Isi nomor peserta awal.",
    });
  }

  const pending = await db.whatsappOutbox.findFirst({
    where: {
      cohortId: input.cohortId,
      kind: "CREATE_GROUP",
      status: { in: ["PENDING", "SENDING"] },
    },
    select: { id: true },
  });
  if (pending) return { status: "QUEUED" as const };

  const attempt = await db.whatsappOutbox.count({
    where: { cohortId: input.cohortId, kind: "CREATE_GROUP" },
  });
  let row: { id: string };
  try {
    row = await db.whatsappOutbox.create({
      data: {
        organizationId: cohort.organizationId,
        cohortId: input.cohortId,
        kind: "CREATE_GROUP",
        dedupeKey: createGroupKey(input.cohortId, attempt),
        payload: { participant },
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "QUEUED" as const };
    }
    throw error;
  }

  const outcome = await runOutboxRowNow(row.id, connection);
  if (outcome.status === "FAILED") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Grup belum berhasil dibuat. ${outcome.error}`,
    });
  }
  if (outcome.status === "SENT") {
    const created = await db.cohort.findUniqueOrThrow({
      where: { id: input.cohortId },
      select: { whatsappGroupUrl: true },
    });
    return { status: "CREATED" as const, url: created.whatsappGroupUrl };
  }
  return { status: "QUEUED" as const };
}

/**
 * Hakgyo stops sending to the group; the group itself stays in WhatsApp and
 * its link stays on the cohort, now editable by hand.
 */
export async function unlinkCohortGroup(cohortId: string) {
  await db.$transaction([
    db.whatsappOutbox.updateMany({
      where: { cohortId, status: "PENDING" },
      data: { status: "CANCELLED", lastError: "Grup kelas dilepas." },
    }),
    db.cohort.update({
      where: { id: cohortId },
      data: { whatsappGroupJid: null, whatsappGroupCreatedAt: null },
    }),
  ]);
}

/**
 * A cohort became OPEN: queue its group when the organization creates groups
 * automatically and the cohort has no group link yet.
 */
export async function enqueueAutoCohortGroup(cohortId: string) {
  if (!isWhatsappEnabled()) return;
  const cohort = await db.cohort.findUnique({
    where: { id: cohortId },
    select: {
      organizationId: true,
      status: true,
      defaultForCourseId: true,
      whatsappGroupJid: true,
      whatsappGroupUrl: true,
    },
  });
  if (!cohort) return;
  const connection = await db.whatsappConnection.findUnique({
    where: { organizationId: cohort.organizationId },
    select: { status: true, autoCreateGroups: true },
  });
  if (
    cohort.status !== "OPEN" ||
    cohort.defaultForCourseId ||
    cohort.whatsappGroupJid ||
    cohort.whatsappGroupUrl ||
    connection?.status !== "CONNECTED" ||
    !connection.autoCreateGroups
  ) {
    return;
  }
  await enqueueWhatsapp([
    {
      organizationId: cohort.organizationId,
      cohortId,
      kind: "CREATE_GROUP",
      dedupeKey: autoCreateGroupKey(cohortId),
      payload: { auto: true },
    },
  ]);
}

/** "Starts soon" message for the meeting's cohort group; expires at the start. */
export async function enqueueMeetingReminder(meetingId: string) {
  if (!isWhatsappEnabled()) return;
  const meeting = await db.cohortMeeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      timezone: true,
      joinUrl: true,
      organizationId: true,
      cohort: {
        select: { id: true, courseId: true, whatsappGroupJid: true },
      },
    },
  });
  if (!meeting?.cohort.whatsappGroupJid) return;
  await enqueueWhatsapp([
    {
      organizationId: meeting.organizationId,
      cohortId: meeting.cohort.id,
      kind: "GROUP_MESSAGE",
      dedupeKey: meetingReminderKey(meeting.id, meeting.startsAt),
      payload: {
        text: meetingReminderText({
          appUrl: env.APP_URL,
          title: meeting.title,
          startsAt: meeting.startsAt,
          timeZone: meeting.timezone,
          joinUrl: meeting.joinUrl,
          courseId: meeting.cohort.courseId,
        }),
      },
      expiresAt: meeting.startsAt,
    },
  ]);
}

/** A moved or deleted meeting drops its queued reminder. */
export async function cancelMeetingMessages(meetingId: string) {
  if (!isWhatsappEnabled()) return;
  await cancelWhatsappOutbox(meetingReminderPrefix(meetingId));
}

/**
 * A Latihan/Tryout was scheduled (or got new classes while scheduled): one
 * message per targeted class with a linked group, expiring when the event
 * opens, when "Beri tahu peserta" was on. A reschedule queues new messages
 * under the new opening time and cancels the old ones. Safe to repeat.
 */
export async function enqueueEventScheduled(eventId: string) {
  if (!isWhatsappEnabled()) return;
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      notifyOnOpen: true,
      opensAt: true,
      closesAt: true,
      organizationId: true,
      course: { select: { title: true } },
      cohorts: {
        select: {
          cohort: { select: { id: true, whatsappGroupJid: true } },
        },
      },
    },
  });
  if (event?.status !== "SCHEDULED" || !event.opensAt) return;
  const opensAt = event.opensAt;
  // "Beri tahu peserta" off: nothing new, and nothing stale left queued.
  const rows = (event.notifyOnOpen ? event.cohorts : [])
    .filter(({ cohort }) => cohort.whatsappGroupJid)
    .map(({ cohort }) => ({
      cohortId: cohort.id,
      dedupeKey: eventScheduledKey(event.id, cohort.id, opensAt),
    }));
  // Earlier opening times are stale; rows for this one are kept (and the
  // insert below skips them).
  await db.whatsappOutbox.updateMany({
    where: {
      dedupeKey: {
        startsWith: eventScheduledPrefix(event.id),
        notIn: rows.map((row) => row.dedupeKey),
      },
      status: "PENDING",
    },
    data: { status: "CANCELLED", lastError: "Jadwal berubah." },
  });
  const text = eventScheduledText({
    appUrl: env.APP_URL,
    eventId: event.id,
    type: event.type,
    title: event.title,
    courseTitle: event.course.title,
    opensAt,
    closesAt: event.closesAt,
  });
  await enqueueWhatsapp(
    rows.map((row) => ({
      ...row,
      organizationId: event.organizationId,
      kind: "GROUP_MESSAGE" as const,
      payload: { text },
      expiresAt: opensAt,
    })),
  );
}

/** A cancelled (or opened early) event drops its queued announcements. */
export async function cancelEventMessages(eventId: string) {
  if (!isWhatsappEnabled()) return;
  await cancelWhatsappOutbox(eventScheduledPrefix(eventId));
}
