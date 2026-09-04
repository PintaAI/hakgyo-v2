import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { db } from "~/server/db";

function configuredEmails() {
  return new Set(
    env.SUPERADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSuperadminEmail(email: string) {
  return configuredEmails().has(email.trim().toLowerCase());
}

export async function getSuperadminUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      suspendedAt: true,
      deletedAt: true,
    },
  });

  if (
    !user ||
    user.suspendedAt ||
    user.deletedAt ||
    !isSuperadminEmail(user.email)
  ) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return user;
}
