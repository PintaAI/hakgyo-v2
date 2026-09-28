import "dotenv/config";

import { db } from "../src/server/db";

// Read-only check that every direct course enrollment (any source except
// COHORT) is mirrored into its course's default self-paced cohort, and that
// the default cohorts hold nothing else. Exits with 1 when anything is off.

type Row = { courseId: string; userId: string; problem: string };

const [directCount, defaultCohortCount, membershipCount, rows] =
  await Promise.all([
    db.courseEnrollment.count({ where: { source: { not: "COHORT" } } }),
    db.cohort.count({ where: { defaultForCourseId: { not: null } } }),
    db.cohortEnrollment.count({
      where: { cohort: { defaultForCourseId: { not: null } } },
    }),
    db.$queryRaw<Row[]>`
      SELECT e."courseId", e."userId",
        CASE WHEN m."id" IS NULL THEN 'missing' ELSE 'mismatched' END AS problem
      FROM "CourseEnrollment" e
      LEFT JOIN "Cohort" c ON c."defaultForCourseId" = e."courseId"
      LEFT JOIN "CohortEnrollment" m
        ON m."cohortId" = c."id" AND m."userId" = e."userId"
      WHERE e."source" <> 'COHORT'
        AND (
          m."id" IS NULL
          OR m."status" <> e."status"
          OR m."source" <> e."source"
          OR m."completedAt" IS DISTINCT FROM e."completedAt"
          OR m."expiresAt" IS DISTINCT FROM e."expiresAt"
        )
      UNION ALL
      SELECT c."courseId", m."userId", 'orphaned' AS problem
      FROM "CohortEnrollment" m
      JOIN "Cohort" c ON c."id" = m."cohortId"
      LEFT JOIN "CourseEnrollment" e
        ON e."courseId" = c."courseId" AND e."userId" = m."userId"
        AND e."source" <> 'COHORT'
      WHERE c."defaultForCourseId" IS NOT NULL AND e."id" IS NULL
    `,
  ]);

const count = (problem: string) =>
  rows.filter((row) => row.problem === problem).length;

console.log(`Direct course enrollments:        ${directCount}`);
console.log(`Default cohorts:                  ${defaultCohortCount}`);
console.log(`Default cohort memberships:       ${membershipCount}`);
console.log(`Missing membership:               ${count("missing")}`);
console.log(`Membership differs from source:   ${count("mismatched")}`);
console.log(`Membership without enrollment:    ${count("orphaned")}`);

if (rows.length > 0) {
  console.log("\nFirst problems (courseId, userId, problem):");
  for (const row of rows.slice(0, 20)) {
    console.log(`  ${row.courseId}  ${row.userId}  ${row.problem}`);
  }
  console.log("\nFAILED: default cohort memberships do not match.");
} else {
  console.log("\nOK: every direct enrollment is mirrored correctly.");
}

await db.$disconnect();
process.exit(rows.length > 0 ? 1 : 0);
