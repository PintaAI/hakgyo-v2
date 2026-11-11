import { isStaleClosedOnDemandAssessment } from "./assessment-state";
import { meetingState } from "./study";

/**
 * Hari Ini's agenda: class meetings and class assessments (Latihan, Tryout)
 * that need the learner soon, most pressing first. A meeting that is live or
 * about to start, then an attempt already started, then by time: the start
 * of a meeting, the closing of an assessment, the opening of a scheduled one.
 */

type AgendaMeeting = {
  id: string;
  startsAt: Date;
  durationMinutes: number;
  status: string;
};

type AgendaEvent = {
  id: string;
  type?: string | null;
  status?: string | null;
  opensAt?: Date | null;
  closesAt: Date | null;
  closedAt?: Date | null;
  attempts: { status: string }[];
};

export type AgendaItem<M, E, C> =
  | {
      kind: "meeting";
      key: string;
      meeting: M;
      cohort: C;
      state: "live" | "joining" | "upcoming";
      at: number;
    }
  | {
      kind: "event";
      key: string;
      event: E;
      state: "started" | "open" | "scheduled";
      at: number;
    };

/** How far ahead the agenda looks for meetings and scheduled assessments. */
const AGENDA_HORIZON_MS = 7 * 24 * 3_600_000;
export const AGENDA_LIMIT = 4;

const RANK = {
  live: 0,
  joining: 0,
  started: 1,
  upcoming: 2,
  open: 2,
  scheduled: 2,
} as const;

export function buildTodayAgenda<
  M extends AgendaMeeting,
  C extends { meetings: M[] },
  E extends AgendaEvent,
>(input: { cohorts: readonly C[]; events: readonly E[]; now: number }) {
  const { now } = input;
  const horizon = now + AGENDA_HORIZON_MS;
  const items: AgendaItem<M, E, C>[] = [];

  for (const cohort of input.cohorts) {
    for (const meeting of cohort.meetings) {
      const state = meetingState(meeting, now);
      if (state === "ended") continue;
      const at = meeting.startsAt.getTime();
      if (state === "upcoming" && at > horizon) continue;
      items.push({
        kind: "meeting",
        key: `meeting:${meeting.id}`,
        meeting,
        cohort,
        state,
        at,
      });
    }
  }

  for (const event of input.events) {
    if (isStaleClosedOnDemandAssessment(event, now)) continue;
    if (event.status === "CLOSED" || event.status === "CANCELLED") continue;
    const attempt = event.attempts[0];
    if (attempt && attempt.status !== "IN_PROGRESS") continue;
    if (event.status === "SCHEDULED") {
      const opensAt = event.opensAt?.getTime();
      if (opensAt === undefined || opensAt > horizon) continue;
      if (opensAt > now) {
        items.push({
          kind: "event",
          key: `event:${event.id}`,
          event,
          state: "scheduled",
          at: opensAt,
        });
        continue;
      }
    }
    const closesAt = event.closesAt?.getTime();
    if (closesAt !== undefined && closesAt <= now) continue;
    items.push({
      kind: "event",
      key: `event:${event.id}`,
      event,
      state: attempt ? "started" : "open",
      at: closesAt ?? Number.MAX_SAFE_INTEGER,
    });
  }

  return items.sort((a, b) => RANK[a.state] - RANK[b.state] || a.at - b.at);
}
