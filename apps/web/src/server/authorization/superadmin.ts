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

type SuperadminUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  suspendedAt?: Date | null;
  deletedAt?: Date | null;
};

/** Pass the already-loaded session user to skip the lookup. */
export async function getSuperadminUser(
  userId: string,
  sessionUser?: SuperadminUser,
) {
  const user =
    sessionUser?.id === userId
      ? {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          image: sessionUser.image ?? null,
          suspendedAt: sessionUser.suspendedAt ?? null,
          deletedAt: sessionUser.deletedAt ?? null,
        }
      : await db.user.findUnique({
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
