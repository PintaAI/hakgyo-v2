import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";

export async function listMcpCatalog(input: {
  organizationId?: string;
  limit: number;
  cursor?: string;
}) {
  const rows = await db.course.findMany({
    where: {
      status: "PUBLISHED",
      organizationId: input.organizationId,
    },
    take: input.limit + 1,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnailUrl: true,
      price: true,
      currency: true,
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { modules: true, cohorts: true } },
    },
  });
  const hasMore = rows.length > input.limit;
  const courses = rows.slice(0, input.limit);

  return {
    courses,
    nextCursor: hasMore ? courses.at(-1)?.id : undefined,
  };
}

export async function getMcpCatalogCourse(courseId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnailUrl: true,
      price: true,
      currency: true,
      progressionMode: true,
      organization: { select: { id: true, name: true, slug: true } },
      modules: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          position: true,
          items: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: { id: true, type: true, position: true },
          },
        },
      },
    },
  });
  if (!course) throw new TRPCError({ code: "NOT_FOUND" });
  return course;
}
