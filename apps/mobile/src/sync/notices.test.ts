import { describe, expect, test } from "bun:test";
import type {
  BundleContent,
  BundleStructure,
} from "@hakgyo/shared/mobile-sync";

import {
  bundleNoticeBaseline,
  diffBundleNotices,
  diffIndexNotices,
  indexNoticeBaseline,
  type BundleNoticeInput,
} from "./notices";
import type { LearnerIndex } from "./types";

const NOW = Date.parse("2026-09-01T08:00:00.000Z");
const TOMORROW = new Date(NOW + 24 * 60 * 60 * 1000);
const NEXT_WEEK = new Date(NOW + 7 * 24 * 60 * 60 * 1000);
const organization = { id: "org-1", name: "Org" };

type Meeting = { id: string; status: string; startsAt: Date; title?: string };
type Event = { id: string; status: string; closesAt: Date | null };
type Attempt = { id: string; status: string; score: number | null };

function learnerIndex(
  input: {
    courseIds?: string[];
    cohorts?: Array<{ id: string; meetings: Meeting[] }>;
    events?: Event[];
    attempts?: Attempt[];
  } = {},
): LearnerIndex {
  const course = (id: string) => ({
    id,
    title: `Course ${id}`,
    organization,
  });
  return {
    generatedAt: new Date(NOW).toISOString(),
    organizationId: "org-1",
    courses: (input.courseIds ?? ["course-1"]).map(course),
    cohorts: (input.cohorts ?? []).map((cohort) => ({
      id: cohort.id,
      name: `Kelas ${cohort.id}`,
      course: course("course-1"),
      meetings: cohort.meetings.map((meeting) => ({
        title: `Meeting ${meeting.id}`,
        ...meeting,
      })),
    })),
    events: (input.events ?? []).map((event) => ({
      ...event,
      title: `Tugas ${event.id}`,
      course: { id: "course-1", title: "Course course-1" },
    })),
    attempts: (input.attempts ?? []).map((attempt) => ({
      ...attempt,
      maxScore: 100,
      courseItemId: "item-9",
      courseItem: { module: { courseId: "course-1" } },
      assessment: { title: `Quiz ${attempt.id}` },
    })),
  } as unknown as LearnerIndex;
}

function diff(previous: LearnerIndex, next: LearnerIndex) {
  return diffIndexNotices(indexNoticeBaseline(previous), next, NOW);
}

describe("index notices", () => {
  test("an identical index is not news", () => {
    const index = learnerIndex({
      cohorts: [
        {
          id: "cohort-1",
          meetings: [{ id: "m1", status: "SCHEDULED", startsAt: TOMORROW }],
        },
      ],
      events: [{ id: "e1", status: "OPEN", closesAt: NEXT_WEEK }],
      attempts: [{ id: "a1", status: "GRADED", score: 80 }],
    });
    expect(diff(index, index)).toEqual([]);
  });

  test("reports new courses and cohorts, not their meetings", () => {
    const notices = diff(
      learnerIndex(),
      learnerIndex({
        courseIds: ["course-1", "course-2"],
        cohorts: [
          {
            id: "cohort-1",
            meetings: [{ id: "m1", status: "SCHEDULED", startsAt: TOMORROW }],
          },
        ],
      }),
    );
    expect(notices.map((notice) => [notice.kind, notice.id])).toEqual([
      ["COURSE_ADDED", "course:course-2@added"],
      ["COHORT_ADDED", "cohort:cohort-1@added"],
    ]);
    expect(notices[0]!.organizationId).toBe("org-1");
  });

  test("reports new, moved and cancelled upcoming meetings", () => {
    const previous = learnerIndex({
      cohorts: [
        {
          id: "cohort-1",
          meetings: [
            { id: "moved", status: "SCHEDULED", startsAt: TOMORROW },
            { id: "cancelled", status: "SCHEDULED", startsAt: TOMORROW },
            { id: "started", status: "SCHEDULED", startsAt: TOMORROW },
          ],
        },
      ],
    });
    const notices = diff(
      previous,
      learnerIndex({
        cohorts: [
          {
            id: "cohort-1",
            meetings: [
              { id: "moved", status: "SCHEDULED", startsAt: NEXT_WEEK },
              { id: "cancelled", status: "CANCELLED", startsAt: TOMORROW },
              // Time-driven status changes are not news.
              { id: "started", status: "STARTED", startsAt: TOMORROW },
              { id: "new", status: "SCHEDULED", startsAt: TOMORROW },
              // Already over when it arrived.
              {
                id: "past",
                status: "SCHEDULED",
                startsAt: new Date(NOW - 60_000),
              },
            ],
          },
        ],
      }),
    );
    expect(notices.map((notice) => notice.kind)).toEqual([
      "MEETING_RESCHEDULED",
      "MEETING_CANCELLED",
      "MEETING_SCHEDULED",
    ]);
    // A reschedule is keyed by its new time: moving it again is news again.
    expect(notices[0]!.id).toBe(
      `meeting:moved@MEETING_RESCHEDULED:${NEXT_WEEK.toISOString()}`,
    );
  });

  test("reports opened, extended and cancelled Tugas", () => {
    const notices = diff(
      learnerIndex({
        events: [
          { id: "reopened", status: "CLOSED", closesAt: null },
          { id: "moved", status: "OPEN", closesAt: TOMORROW },
          { id: "cancelled", status: "OPEN", closesAt: TOMORROW },
          { id: "closed", status: "OPEN", closesAt: TOMORROW },
        ],
      }),
      learnerIndex({
        events: [
          { id: "reopened", status: "OPEN", closesAt: NEXT_WEEK },
          { id: "moved", status: "OPEN", closesAt: NEXT_WEEK },
          { id: "cancelled", status: "CANCELLED", closesAt: TOMORROW },
          { id: "closed", status: "CLOSED", closesAt: TOMORROW },
          { id: "new", status: "OPEN", closesAt: null },
        ],
      }),
    );
    expect(notices.map((notice) => [notice.kind, notice.group])).toEqual([
      ["EVENT_OPENED", "event:reopened"],
      ["EVENT_DEADLINE_CHANGED", "event:moved"],
      ["EVENT_CANCELLED", "event:cancelled"],
      ["EVENT_OPENED", "event:new"],
    ]);
  });

  test("reports reviews finishing, not the learner's own auto-graded attempts", () => {
    const notices = diff(
      learnerIndex({
        attempts: [
          { id: "reviewed", status: "IN_REVIEW", score: null },
          { id: "submitted", status: "SUBMITTED", score: null },
          { id: "auto", status: "IN_PROGRESS", score: null },
          { id: "regraded", status: "GRADED", score: 60 },
          { id: "same", status: "GRADED", score: 90 },
        ],
      }),
      learnerIndex({
        attempts: [
          { id: "reviewed", status: "GRADED", score: 75 },
          { id: "submitted", status: "GRADED", score: 50 },
          { id: "auto", status: "GRADED", score: 100 },
          { id: "regraded", status: "GRADED", score: 70 },
          { id: "same", status: "GRADED", score: 90 },
          { id: "offline", status: "GRADED", score: 40 },
        ],
      }),
    );
    expect(notices.map((notice) => notice.group)).toEqual([
      "attempt:reviewed",
      "attempt:submitted",
      "attempt:regraded",
    ]);
    expect(notices[0]).toMatchObject({
      kind: "ATTEMPT_GRADED",
      courseId: "course-1",
      courseItemId: "item-9",
      score: 75,
      maxScore: 100,
    });
  });

  test("removals are not news", () => {
    expect(
      diff(
        learnerIndex({
          courseIds: ["course-1", "course-2"],
          events: [{ id: "e1", status: "OPEN", closesAt: TOMORROW }],
        }),
        learnerIndex(),
      ),
    ).toEqual([]);
  });
});

function structure(
  modules: Array<{
    id: string;
    items: Array<{ id: string; materialId?: string; title?: string }>;
  }>,
): BundleStructure {
  return {
    title: "Korean 1",
    description: null,
    thumbnailUrl: null,
    status: "PUBLISHED",
    progressionMode: "OPEN",
    modules: modules.map((module, moduleIndex) => ({
      id: module.id,
      title: `Bab ${module.id}`,
      description: null,
      position: moduleIndex,
      items: module.items.map((item, itemIndex) => ({
        id: item.id,
        type: "MATERIAL",
        position: itemIndex,
        title: item.title ?? `Item ${item.id}`,
        materialId: item.materialId ?? `material-${item.id}`,
        vocabularySetId: null,
        assessmentId: null,
        assessmentPassingScore: null,
      })),
    })),
  };
}

function content(materials: Record<string, string>): BundleContent {
  return {
    placements: {},
    materials: Object.fromEntries(
      Object.entries(materials).map(([id, text]) => [
        id,
        {
          id,
          title: id,
          description: null,
          content: { type: "doc", text },
          editorSchemaVersion: 1,
          requirementPolicy: "ALL",
          assetIds: [],
        },
      ]),
    ),
    vocabularySets: {},
    assessments: {},
    pdfBooks: {},
    assets: {},
  };
}

function bundle(
  revision: string,
  bundleStructure: BundleStructure,
  bundleContent: BundleContent,
): BundleNoticeInput {
  return {
    courseId: "course-1",
    organizationId: "org-1",
    revision,
    structure: bundleStructure,
    content: bundleContent,
  };
}

function diffBundle(previous: BundleNoticeInput, next: BundleNoticeInput) {
  return diffBundleNotices(
    bundleNoticeBaseline(previous),
    bundleNoticeBaseline(next),
    next,
    NOW,
  );
}

describe("bundle notices", () => {
  const base = bundle(
    "1",
    structure([{ id: "m1", items: [{ id: "i1" }, { id: "i2" }] }]),
    content({ "material-i1": "annyeong", "material-i2": "gamsa" }),
  );

  test("a new revision without learner-visible changes is not news", () => {
    const renamed = bundle(
      "2",
      structure([
        // Reordered and renamed.
        { id: "m1", items: [{ id: "i2" }, { id: "i1", title: "Salam" }] },
      ]),
      content({ "material-i1": "annyeong", "material-i2": "gamsa" }),
    );
    expect(diffBundle(base, renamed)).toBeNull();
  });

  test("reports new modules, new items and changed material", () => {
    const next = bundle(
      "2",
      structure([
        { id: "m1", items: [{ id: "i1" }, { id: "i2" }, { id: "i3" }] },
        { id: "m2", items: [{ id: "i4" }] },
        // Empty modules are not news until they get items.
        { id: "m3", items: [] },
      ]),
      content({
        "material-i1": "annyeonghaseyo",
        "material-i2": "gamsa",
        "material-i3": "new",
        "material-i4": "new",
      }),
    );
    expect(diffBundle(base, next)).toEqual({
      kind: "COURSE_CONTENT",
      id: "content:course-1:2@changed",
      group: "content:course-1:2",
      organizationId: "org-1",
      createdAt: NOW,
      courseId: "course-1",
      courseTitle: "Korean 1",
      revision: "2",
      modulesAdded: [{ id: "m2", title: "Bab m2" }],
      itemsAdded: [{ id: "i3", title: "Item i3", moduleId: "m1" }],
      itemsUpdated: [{ id: "i1", title: "Item i1", moduleId: "m1" }],
    });
  });

  test("an item moved to another module is not new", () => {
    const moved = bundle(
      "2",
      structure([
        { id: "m1", items: [{ id: "i1" }] },
        { id: "m2", items: [{ id: "i2" }] },
      ]),
      content({ "material-i1": "annyeong", "material-i2": "gamsa" }),
    );
    expect(diffBundle(base, moved)?.modulesAdded).toEqual([
      { id: "m2", title: "Bab m2" },
    ]);
    expect(diffBundle(base, moved)?.itemsAdded).toEqual([]);
    expect(diffBundle(base, moved)?.itemsUpdated).toEqual([]);
  });
});
