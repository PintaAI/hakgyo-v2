import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  courseAccessMembershipWhere,
  courseAccessWhere,
  findOtherRunningClass,
  learnerClassCohortWhere,
  liveClassCohortWhere,
} from "./cohort-access";

const now = new Date("2026-08-17T00:00:00.000Z");

describe("cohort-derived course access", () => {
  test("grants access through unexpired memberships of non-draft cohorts", () => {
    expect(courseAccessMembershipWhere("user-1", now)).toEqual({
      userId: "user-1",
      status: { in: ["ACTIVE", "COMPLETED"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      cohort: { status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] } },
    });
  });

  test("keeps access after a class cohort ends", () => {
    const where = courseAccessMembershipWhere("user-1", now);
    expect(where.cohort).not.toHaveProperty("endsAt");
    expect(where.cohort).not.toHaveProperty("OR");
  });

  test("filters courses by a membership granting access", () => {
    expect(courseAccessWhere("user-1", now)).toEqual({
      cohorts: {
        some: {
          status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] },
          enrollments: {
            some: {
              userId: "user-1",
              status: { in: ["ACTIVE", "COMPLETED"] },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        },
      },
    });
  });

  test("limits live class views to running class cohorts", () => {
    expect(liveClassCohortWhere(now)).toEqual({
      defaultForCourseId: null,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    });
  });
});

type Row = Record<string, unknown>;

const filterOperators = new Set(["in", "notIn", "not", "gt", "some", "none"]);

function same(value: unknown, operand: unknown) {
  return value instanceof Date && operand instanceof Date
    ? value.getTime() === operand.getTime()
    : value === operand;
}

/** Evaluates the subset of Prisma `where` filters these helpers build. */
function matches(row: Row, where: object): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (condition === undefined) return true;
    if (key === "OR") {
      return (condition as object[]).some((branch) => matches(row, branch));
    }
    const value = row[key];
    if (
      condition === null ||
      typeof condition !== "object" ||
      condition instanceof Date
    ) {
      return same(value, condition);
    }
    const filters = Object.entries(condition as object);
    if (!filters.every(([operator]) => filterOperators.has(operator))) {
      return matches(value as Row, condition as object);
    }
    return filters.every(([operator, operand]) => {
      switch (operator) {
        case "in":
          return (operand as unknown[]).includes(value);
        case "notIn":
          return !(operand as unknown[]).includes(value);
        case "not":
          return !same(value, operand);
        case "gt":
          return value instanceof Date && value > (operand as Date);
        case "some":
          return (value as Row[]).some((item) =>
            matches(item, operand as object),
          );
        case "none":
          return !(value as Row[]).some((item) =>
            matches(item, operand as object),
          );
        default:
          return false;
      }
    });
  });
}

describe("classes on Belajar", () => {
  const past = new Date("2026-08-01T00:00:00.000Z");
  const future = new Date("2026-09-01T00:00:00.000Z");

  function createWorld() {
    const cohorts: Row[] = [];
    const courses = new Map<string, { id: string; cohorts: Row[] }>();
    function course(id: string) {
      const existing = courses.get(id);
      if (existing) return existing;
      const created = { id, cohorts: [] as Row[] };
      courses.set(id, created);
      return created;
    }
    function cohort(id: string, courseId: string, fields: Row = {}) {
      const owner = course(courseId);
      const created: Row = {
        id,
        defaultForCourseId: null,
        status: "OPEN",
        endsAt: null,
        course: owner,
        enrollments: [],
        ...fields,
      };
      owner.cohorts.push(created);
      cohorts.push(created);
      return created;
    }
    function kelasMandiri(courseId: string) {
      return cohort(`${courseId}-mandiri`, courseId, {
        defaultForCourseId: courseId,
      });
    }
    function join(target: Row, fields: Row = {}) {
      (target.enrollments as Row[]).push({
        userId: "user-1",
        status: "ACTIVE",
        expiresAt: null,
        ...fields,
      });
    }
    function belajar(options?: { hiddenKelasMandiriCourseIds?: string[] }) {
      const where = learnerClassCohortWhere("user-1", now, options);
      return cohorts
        .filter((candidate) => matches(candidate, where))
        .map((candidate) => candidate.id);
    }
    return { cohort, kelasMandiri, join, belajar };
  }

  test("shows the Kelas Mandiri of a curriculum studied on its own", () => {
    const world = createWorld();
    world.join(world.kelasMandiri("hangeul"));
    expect(world.belajar()).toEqual(["hangeul-mandiri"]);
  });

  test("pauses the Kelas Mandiri while the learner is in a running class of the curriculum", () => {
    for (const status of ["ACTIVE", "COMPLETED"]) {
      const world = createWorld();
      world.join(world.kelasMandiri("course-1"));
      world.join(world.cohort("class-1", "course-1", { endsAt: future }), {
        status,
      });
      expect(world.belajar()).toEqual(["class-1"]);
    }
  });

  test("brings the Kelas Mandiri back once the class ends or the learner leaves it", () => {
    const cases: Array<{ class: Row; membership: Row }> = [
      { class: { endsAt: past }, membership: {} },
      { class: { status: "COMPLETED" }, membership: {} },
      { class: { status: "CANCELLED" }, membership: {} },
      { class: { status: "DRAFT" }, membership: {} },
      { class: {}, membership: { status: "CANCELLED" } },
      { class: {}, membership: { expiresAt: past } },
    ];
    for (const { class: classFields, membership } of cases) {
      const world = createWorld();
      world.join(world.kelasMandiri("course-1"));
      world.join(world.cohort("class-1", "course-1", classFields), membership);
      expect(world.belajar()).toEqual(["course-1-mandiri"]);
    }
  });

  test("keeps the Kelas Mandiri next to classes of other curricula and other learners' classes", () => {
    const world = createWorld();
    world.join(world.kelasMandiri("course-1"));
    world.join(world.cohort("class-2", "course-2"));
    const otherLearnersClass = world.cohort("class-1", "course-1");
    (otherLearnersClass.enrollments as Row[]).push({
      userId: "user-2",
      status: "ACTIVE",
      expiresAt: null,
    });
    expect(world.belajar()).toEqual(["course-1-mandiri", "class-2"]);
  });

  test("shows a completed Kelas Mandiri unless the learner hid that curriculum", () => {
    const world = createWorld();
    world.join(world.kelasMandiri("hangeul"), { status: "COMPLETED" });
    world.join(world.kelasMandiri("course-1"));
    expect(world.belajar()).toEqual(["hangeul-mandiri", "course-1-mandiri"]);
    expect(world.belajar({ hiddenKelasMandiriCourseIds: ["hangeul"] })).toEqual(
      ["course-1-mandiri"],
    );
  });

  test("ended Kelas Mandiri memberships show no card", () => {
    for (const membership of [{ status: "CANCELLED" }, { expiresAt: past }]) {
      const world = createWorld();
      world.join(world.kelasMandiri("course-1"), membership);
      expect(world.belajar()).toEqual([]);
    }
  });
});

describe("other running class", () => {
  function createDatabase() {
    const lookups: Array<{ where: Record<string, unknown> }> = [];
    const db = {
      cohortEnrollment: {
        findFirst: (args: { where: Record<string, unknown> }) => {
          lookups.push(args);
          return Promise.resolve({
            cohort: { id: "class-1", name: "Kelas Pagi" },
          });
        },
      },
    } as unknown as Prisma.TransactionClient;
    return { db, lookups };
  }

  test("skips the class being joined", async () => {
    const { db, lookups } = createDatabase();
    await findOtherRunningClass(db, {
      cohortId: "class-2",
      courseId: "course-1",
      userId: "user-1",
      now,
    });
    expect(lookups[0]?.where.cohortId).toEqual({ not: "class-2" });
  });

  test("counts any running class when joining the Kelas Mandiri", async () => {
    const { db, lookups } = createDatabase();
    const otherClass = await findOtherRunningClass(db, {
      courseId: "course-1",
      userId: "user-1",
      now,
    });
    expect(otherClass).toEqual({ id: "class-1", name: "Kelas Pagi" });
    expect(lookups[0]?.where).not.toHaveProperty("cohortId");
    expect(lookups[0]?.where.cohort).toEqual({
      courseId: "course-1",
      ...liveClassCohortWhere(now),
    });
  });
});
