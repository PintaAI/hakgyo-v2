import { db } from "~/server/db";

export async function getMcpContext(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      organizationMemberships: {
        orderBy: { organization: { name: "asc" } },
        select: {
          id: true,
          role: true,
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });
}
