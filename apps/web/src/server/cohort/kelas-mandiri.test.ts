import { describe, expect, test } from "bun:test";

import { Prisma } from "../../../generated/prisma/client";
import {
  assertKelasMandiriFields,
  createKelasMandiri,
  kelasMandiriExistsMessage,
} from "./kelas-mandiri";
import { kelasMandiriData } from "~/server/enrollment/default-cohort";

const course = { id: "course-1", organizationId: "organization-1" };

async function rejection(operation: Promise<unknown> | (() => unknown)) {
  try {
    await (typeof operation === "function" ? operation() : operation);
    return null;
  } catch (error) {
    return error as { code: string; message: string };
  }
}

function createDatabase(options: { exists?: boolean } = {}) {
  const creates: unknown[] = [];
  const db = {
    cohort: {
      create: (args: { data: unknown }) => {
        if (options.exists) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError("Unique constraint", {
              code: "P2002",
              clientVersion: "test",
            }),
          );
        }
        creates.push(args.data);
        return Promise.resolve({ id: "course-1-mandiri" });
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, creates };
}

describe("creating a Kelas Mandiri", () => {
  test("makes the same row as first use, with no dates, status OPEN and no join mode", async () => {
    const { db, creates } = createDatabase();

    // Omitted fields arrive as undefined and must not drop the defaults.
    await createKelasMandiri(db, course, {
      status: undefined,
      name: undefined,
    });
    expect(creates).toEqual([kelasMandiriData(course)]);
    expect(creates[0]).toEqual({
      courseId: "course-1",
      organizationId: "organization-1",
      name: "Kelas Mandiri",
      status: "OPEN",
      defaultForCourseId: "course-1",
    });
  });

  test("keeps the teacher's name and description", async () => {
    const { db, creates } = createDatabase();

    await createKelasMandiri(db, course, {
      name: "  Belajar Sendiri  ",
      description: "Untuk murid yang belajar kapan saja.",
    });
    expect(creates[0]).toMatchObject({
      name: "Belajar Sendiri",
      description: "Untuk murid yang belajar kapan saja.",
      defaultForCourseId: "course-1",
    });
  });

  test("refuses a second Kelas Mandiri for the curriculum", async () => {
    const { db } = createDatabase({ exists: true });

    const error = await rejection(createKelasMandiri(db, course, {}));
    expect(error?.code).toBe("CONFLICT");
    expect(error?.message).toBe(kelasMandiriExistsMessage);
  });

  test("takes a status like any class", async () => {
    const { db, creates } = createDatabase();

    await createKelasMandiri(db, course, { status: "DRAFT" });
    expect(creates[0]).toMatchObject({ status: "DRAFT" });
  });

  test("refuses dates", async () => {
    const { db, creates } = createDatabase();

    for (const fields of [
      { startsAt: new Date("2026-11-01") },
      { endsAt: new Date("2026-12-01") },
    ]) {
      const error = await rejection(createKelasMandiri(db, course, fields));
      expect(error?.code).toBe("BAD_REQUEST");
    }
    expect(creates).toHaveLength(0);
  });
});

describe("updating a Kelas Mandiri", () => {
  test("allows any status and clearing dates", () => {
    for (const fields of [{ startsAt: null, endsAt: null }, {}]) {
      expect(() => assertKelasMandiriFields(fields)).not.toThrow();
    }
  });

  test("refuses dates", async () => {
    for (const fields of [
      { startsAt: new Date("2026-11-01") },
      { endsAt: new Date("2026-12-01") },
    ]) {
      const error = await rejection(() => assertKelasMandiriFields(fields));
      expect(error?.code).toBe("BAD_REQUEST");
    }
  });
});
