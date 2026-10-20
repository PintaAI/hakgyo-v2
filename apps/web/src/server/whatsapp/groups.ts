import "server-only";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  createGroup,
  EvolutionApiError,
  findGroupInfo,
  getGroupInviteUrl,
  sendText,
  updateGroupPicture,
} from "~/server/whatsapp/client";
import { groupDescription, groupSubject } from "~/server/whatsapp/messages";

/** A linked number, with its decrypted instance token. */
export type ActiveConnection = {
  organizationId: string;
  instanceName: string;
  token: string;
  initialParticipantPhone: string | null;
};

/** Work that cannot succeed as requested; `permanent` skips the retries. */
export class WhatsappWorkError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
  ) {
    super(message);
  }
}

/** The row is no longer needed (cohort gone, group unlinked, link set by hand). */
export class WhatsappWorkCancelled extends Error {}

export type CreateGroupPayload = {
  /** Number added with the linked one; WhatsApp needs one besides it. */
  participant?: string;
  /** Automatic creation never replaces a link staff set by hand. */
  auto?: boolean;
};

/**
 * Creates the cohort's group, sets its photo and stores its invite link.
 * Resumable: the group id is saved as soon as WhatsApp returns it, so a retry
 * after a later step failed only fetches the invite link again.
 */
export async function createCohortGroup(
  connection: ActiveConnection,
  cohortId: string,
  payload: CreateGroupPayload,
) {
  const cohort = await db.cohort.findUnique({
    where: { id: cohortId },
    select: {
      id: true,
      name: true,
      description: true,
      defaultForCourseId: true,
      whatsappGroupJid: true,
      whatsappGroupUrl: true,
      course: { select: { id: true, title: true, thumbnailUrl: true } },
    },
  });
  if (!cohort || cohort.defaultForCourseId) {
    throw new WhatsappWorkCancelled("Kelas tidak ditemukan.");
  }

  let groupJid = cohort.whatsappGroupJid;
  if (!groupJid) {
    if (payload.auto && cohort.whatsappGroupUrl) {
      throw new WhatsappWorkCancelled("Kelas sudah punya link grup.");
    }
    const participant =
      payload.participant ?? connection.initialParticipantPhone;
    if (!participant) {
      throw new WhatsappWorkError(
        "Isi nomor peserta awal di pengaturan WhatsApp organisasi.",
        true,
      );
    }
    const group = await createGroup(connection.instanceName, connection.token, {
      subject: groupSubject(cohort.name),
      description: groupDescription({
        appUrl: env.APP_URL,
        cohortDescription: cohort.description,
        courseId: cohort.course.id,
        courseTitle: cohort.course.title,
      }),
      participants: [participant],
    });
    groupJid = group.id;
    await db.cohort.update({
      where: { id: cohort.id },
      data: { whatsappGroupJid: groupJid, whatsappGroupCreatedAt: new Date() },
    });
    if (cohort.course.thumbnailUrl) {
      // The photo is a nicety: the group is usable without it.
      await updateGroupPicture(connection.instanceName, connection.token, {
        groupJid,
        image: cohort.course.thumbnailUrl,
      }).catch((error: unknown) => {
        console.error("Failed to set the WhatsApp group photo", {
          cohortId,
          error,
        });
      });
    }
  }

  const inviteUrl = await getGroupInviteUrl(
    connection.instanceName,
    connection.token,
    groupJid,
  );
  await db.cohort.update({
    where: { id: cohort.id },
    data: { whatsappGroupUrl: inviteUrl },
  });
  return { groupJid, inviteUrl };
}

/** Sends one message to the cohort's linked group. */
export async function sendCohortGroupMessage(
  connection: ActiveConnection,
  cohortId: string,
  text: string,
) {
  const cohort = await db.cohort.findUnique({
    where: { id: cohortId },
    select: { whatsappGroupJid: true },
  });
  const groupJid = cohort?.whatsappGroupJid;
  if (!groupJid) throw new WhatsappWorkCancelled("Grup kelas sudah dilepas.");
  try {
    await sendText(connection.instanceName, connection.token, {
      to: groupJid,
      text,
    });
  } catch (error) {
    if (error instanceof EvolutionApiError && error.permanent) {
      await unlinkIfGroupGone(connection, cohortId, groupJid);
    }
    throw error;
  }
}

/**
 * After a rejected send: when the group no longer exists for the linked
 * number (deleted, or the number left it), stop sending to it.
 */
async function unlinkIfGroupGone(
  connection: ActiveConnection,
  cohortId: string,
  groupJid: string,
) {
  try {
    await findGroupInfo(connection.instanceName, connection.token, groupJid);
  } catch (error) {
    if (!(error instanceof EvolutionApiError) || error.status !== 404) return;
    await db.cohort.updateMany({
      where: { id: cohortId, whatsappGroupJid: groupJid },
      data: {
        whatsappGroupJid: null,
        whatsappGroupCreatedAt: null,
        whatsappGroupUrl: null,
      },
    });
  }
}
