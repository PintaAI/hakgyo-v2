/**
 * One-off cleanup of the abandoned `20260925120000_course_pdf_lessons`
 * prototype (replaced by PdfBook / PdfBookPage). Removes its two tables and
 * its `_prisma_migrations` record from the database in DIRECT_URL.
 *
 *   bun scripts/cleanup-course-pdf-lessons.ts            # dry run + backup
 *   bun scripts/cleanup-course-pdf-lessons.ts --confirm  # backup + delete
 *
 * Every run first writes the rows to course_pdf_lessons-backup.json. The
 * Asset rows (and R2 files) the pages point to are left untouched.
 */
import { writeFileSync } from "node:fs";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../generated/prisma/client";

const MIGRATION = "20260925120000_course_pdf_lessons";
const BACKUP_FILE = "course_pdf_lessons-backup.json";
const confirmed = process.argv.includes("--confirm");

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("DIRECT_URL is not set (apps/web/.env).");
  process.exit(1);
}
console.log(`Database host: ${new URL(connectionString).host}`);

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

async function tableExists(name: string) {
  const [row] = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT to_regclass('public."${name}"') IS NOT NULL AS "exists"`,
  );
  return row?.exists ?? false;
}

try {
  const hasDocuments = await tableExists("CoursePdfDocument");
  const hasPages = await tableExists("CoursePdfPage");
  const documents = hasDocuments
    ? await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "CoursePdfDocument"`)
    : [];
  const pages = hasPages
    ? await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "CoursePdfPage"`)
    : [];
  const migration = await db.$queryRawUnsafe<unknown[]>(
    `SELECT * FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION,
  );

  console.log({
    CoursePdfDocument: hasDocuments ? documents.length : "missing",
    CoursePdfPage: hasPages ? pages.length : "missing",
    migrationRecord: migration.length > 0,
  });

  if (!hasDocuments && !hasPages && migration.length === 0) {
    console.log("Nothing to clean up.");
    process.exit(0);
  }

  writeFileSync(
    BACKUP_FILE,
    JSON.stringify({ documents, pages, migration }, null, 2),
  );
  console.log(`Backup written to ${BACKUP_FILE}`);

  if (!confirmed) {
    console.log("Dry run. Re-run with --confirm to delete.");
    process.exit(0);
  }

  await db.$transaction([
    db.$executeRawUnsafe(`DROP TABLE IF EXISTS "CoursePdfPage"`),
    db.$executeRawUnsafe(`DROP TABLE IF EXISTS "CoursePdfDocument"`),
    db.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
      MIGRATION,
    ),
  ]);
  console.log(
    "Dropped CoursePdfPage and CoursePdfDocument and removed the migration record.",
  );
} finally {
  await db.$disconnect();
}
