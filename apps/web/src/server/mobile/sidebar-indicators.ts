export type SidebarIndicatorKind = "MODULE" | "ASSESSMENT" | "MEETING";

export type SidebarIndicatorCandidate = {
  key: string;
  kind: SidebarIndicatorKind;
  entityId: string;
  courseId: string;
};

type IndicatorSource = {
  outlines: Array<
    readonly [
      string,
      {
        progressionMode: string;
        modules: Array<{
          id: string;
          access: string;
          isCompleted: boolean;
        }>;
      },
    ]
  >;
  events: Array<{
    id: string;
    status: string;
    openedAt: Date | null;
    createdAt: Date;
    closesAt: Date | null;
    course: { id: string };
    attempts: Array<{ status: string }>;
  }>;
  cohorts: Array<{
    course: { id: string };
    meetings: Array<{
      id: string;
      status: string;
      startsAt: Date;
      durationMinutes: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
  now?: Date;
};

function versionedKey(
  kind: Lowercase<Exclude<SidebarIndicatorKind, "MODULE">>,
  id: string,
  version: Date,
) {
  return `${kind}:${id}:${version.toISOString()}`;
}

/**
 * Computes the current learner-facing updates. Read state is deliberately not
 * part of this module: the same candidates can be compared with any receipt
 * adapter without teaching callers how availability is derived.
 */
export function buildSidebarIndicatorCandidates({
  outlines,
  events,
  cohorts,
  now = new Date(),
}: IndicatorSource): SidebarIndicatorCandidate[] {
  const candidates: SidebarIndicatorCandidate[] = [];

  for (const [courseId, outline] of outlines) {
    if (outline.progressionMode !== "SEQUENTIAL") continue;
    for (const courseModule of outline.modules) {
      if (courseModule.access === "LOCKED" || courseModule.isCompleted)
        continue;
      candidates.push({
        key: `module:${courseModule.id}`,
        kind: "MODULE",
        entityId: courseModule.id,
        courseId,
      });
    }
  }

  for (const event of events) {
    const attempt = event.attempts[0];
    if (
      event.status !== "OPEN" ||
      !event.closesAt ||
      event.closesAt <= now ||
      (attempt && attempt.status !== "IN_PROGRESS")
    ) {
      continue;
    }
    candidates.push({
      key: versionedKey(
        "assessment",
        event.id,
        event.openedAt ?? event.createdAt,
      ),
      kind: "ASSESSMENT",
      entityId: event.id,
      courseId: event.course.id,
    });
  }

  for (const cohort of cohorts) {
    for (const meeting of cohort.meetings) {
      const end = new Date(
        meeting.startsAt.getTime() + meeting.durationMinutes * 60_000,
      );
      if (
        meeting.status === "CANCELLED" ||
        meeting.status === "ENDED" ||
        end <= now
      ) {
        continue;
      }
      candidates.push({
        key: versionedKey("meeting", meeting.id, meeting.updatedAt),
        kind: "MEETING",
        entityId: meeting.id,
        courseId: cohort.course.id,
      });
    }
  }

  return candidates;
}
