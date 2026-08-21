import { z } from "zod";

export const pageInput = z.object({
  limit: z.number().int().min(1).max(50).default(25),
  cursor: z.string().min(1).optional(),
  includeTotal: z.boolean().default(false),
});

export function pageResult<T extends { id: string }>(
  rows: T[],
  limit: number,
  total?: number,
) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    ...(total === undefined ? {} : { total }),
  };
}
