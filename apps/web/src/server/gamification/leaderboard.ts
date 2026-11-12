import { levelForXp } from "@hakgyo/shared/xp-level";

import { Prisma } from "../../../generated/prisma/client";
import {
  getLocalCalendarWindow,
  shiftDateKey,
} from "~/server/gamification/logic";

type Db = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** Everyone's week starts on Monday in WIB, where most learners are. */
export const LEADERBOARD_TIME_ZONE = "Asia/Jakarta";
export const LEADERBOARD_LIMIT = 100;

export type LeaderboardEntry = {
  rank: number;
  name: string;
  image: string | null;
  level: number;
  xp: number;
  isMe: boolean;
};

export type WeeklyLeaderboard = {
  /** Monday (`YYYY-MM-DD`, WIB) the ranking counts from. */
  weekStartsOn: string;
  /** Learners with XP this week. */
  participants: number;
  entries: LeaderboardEntry[];
  /** The viewer, also when outside the top; null without XP this week. */
  me: (LeaderboardEntry & { xpToNextRank: number | null }) | null;
};

type Row = {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  totalXp: number;
  rank: bigint | number;
  participants: bigint | number;
};

/**
 * Shows only the first name and the initial of the last one, because learners
 * of other organizations see the global board: "Qurotha Ayunina" → "Qurotha A.".
 */
export function leaderboardName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Murid";
  const [first, ...rest] = words;
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first!;
}

/** XP the viewer needs to pass the learner one rank above. */
export function xpToPass(myXp: number, aboveXp: number | undefined) {
  if (aboveXp === undefined) return null;
  // Equal XP is ranked by who reached it first, so a tie is not enough.
  return Math.max(1, aboveXp - myXp + 1);
}

export function leaderboardWeek(now: Date) {
  const { startsOn } = getLocalCalendarWindow(now, LEADERBOARD_TIME_ZONE);
  return { startsOn, endsOn: shiftDateKey(startsOn, 7) };
}

/**
 * Ranks learners by the XP of this week (Monday to Sunday, WIB), across every
 * organization or within one. Equal XP goes to whoever reached it first.
 * Returns the top `limit`, the viewer and the learner just above the viewer.
 */
export async function loadWeeklyLeaderboard(
  db: Db,
  input: {
    userId: string;
    organizationId?: string;
    now?: Date;
    limit?: number;
  },
): Promise<WeeklyLeaderboard> {
  const limit = input.limit ?? LEADERBOARD_LIMIT;
  const week = leaderboardWeek(input.now ?? new Date());
  const start = new Date(`${week.startsOn}T00:00:00.000Z`);
  const end = new Date(`${week.endsOn}T00:00:00.000Z`);
  // activityDate is the learner's local date; occurredAt bounds the scan (and
  // lets the organization index serve it) with a day of slack for time zones.
  const scanFrom = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const scanTo = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const organizationFilter = input.organizationId
    ? Prisma.sql`AND event."organizationId" = ${input.organizationId}`
    : Prisma.empty;

  const rows = await db.$queryRaw<Row[]>`
    WITH weekly AS (
      SELECT
        event."userId",
        SUM(event."xpAwarded")::integer AS xp,
        MAX(event."occurredAt") AS "reachedAt"
      FROM "UserActivityEvent" AS event
      WHERE event."occurredAt" >= ${scanFrom}
        AND event."occurredAt" < ${scanTo}
        AND event."activityDate" >= ${start}::date
        AND event."activityDate" < ${end}::date
        ${organizationFilter}
      GROUP BY event."userId"
      HAVING SUM(event."xpAwarded") > 0
    ),
    ranked AS (
      SELECT
        weekly."userId",
        weekly.xp,
        ROW_NUMBER() OVER (
          ORDER BY weekly.xp DESC, weekly."reachedAt" ASC, weekly."userId" ASC
        ) AS rank,
        COUNT(*) OVER () AS participants
      FROM weekly
      JOIN "user" AS account ON account.id = weekly."userId"
      WHERE account."deletedAt" IS NULL AND account."suspendedAt" IS NULL
    )
    SELECT
      ranked."userId",
      account.name,
      account.image,
      ranked.xp,
      COALESCE(gamification."totalXp", 0) AS "totalXp",
      ranked.rank,
      ranked.participants
    FROM ranked
    JOIN "user" AS account ON account.id = ranked."userId"
    LEFT JOIN "UserGamification" AS gamification
      ON gamification."userId" = ranked."userId"
    WHERE ranked.rank <= ${limit}
      OR ranked."userId" = ${input.userId}
      OR ranked.rank = (
        SELECT mine.rank - 1 FROM ranked AS mine WHERE mine."userId" = ${input.userId}
      )
    ORDER BY ranked.rank
  `;

  const toEntry = (row: Row): LeaderboardEntry => ({
    rank: Number(row.rank),
    name: leaderboardName(row.name),
    image: row.image,
    level: levelForXp(row.totalXp).level,
    xp: row.xp,
    isMe: row.userId === input.userId,
  });
  const entries = rows.map(toEntry);
  const me = entries.find((entry) => entry.isMe) ?? null;
  const above = me
    ? entries.find((entry) => entry.rank === me.rank - 1)
    : undefined;

  return {
    weekStartsOn: week.startsOn,
    participants: rows[0] ? Number(rows[0].participants) : 0,
    entries: entries.filter((entry) => entry.rank <= limit),
    me: me ? { ...me, xpToNextRank: xpToPass(me.xp, above?.xp) } : null,
  };
}
