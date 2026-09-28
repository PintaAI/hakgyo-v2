import type { Prisma } from "../../../generated/prisma/client";

/** Case-insensitive match on a user's name or email. */
export function userSearchWhere(search: string): Prisma.UserWhereInput {
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };
}
