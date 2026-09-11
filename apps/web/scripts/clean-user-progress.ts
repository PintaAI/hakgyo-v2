import "dotenv/config";

import { parseArgs } from "node:util";

import { db } from "../src/server/db";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  strict: true,
  options: {
    execute: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const email = positionals[0];

if (values.help || !email) {
  console.log(
    "Usage: bun scripts/clean-user-progress.ts <email> [--execute]\n\n" +
      "Without --execute this is a dry run: it only prints what WOULD be deleted.\n" +
      "With --execute it deletes learning progress for the user with this email.\n\n" +
      "Deleted: content progress, assessment attempts (+ answers), vocabulary\n" +
      "memory + recall challenges, gamification activity/achievements/summary.\n" +
      "Kept: user account, sessions, enrollments, event participations.",
  );
  process.exit(values.help ? 0 : 1);
}

const user = await db.user.findUnique({
  where: { email },
  select: { id: true, name: true, email: true },
});

if (!user) {
  console.error(`No user found with email ${email}. Nothing to do.`);
  process.exit(1);
}

const userId = user.id;

async function collectCounts() {
  const attemptIds = (
    await db.assessmentAttempt.findMany({
      where: { userId },
      select: { id: true },
    })
  ).map((attempt) => attempt.id);
  const answerIds = attemptIds.length
    ? (
        await db.assessmentAnswer.findMany({
          where: { attemptId: { in: attemptIds } },
          select: { id: true },
        })
      ).map((answer) => answer.id)
    : [];

  const [selections, answers, content, challenges, memory, activity, achievements, gamification] =
    await Promise.all([
      answerIds.length
        ? db.assessmentAnswerSelection.count({
            where: { answerId: { in: answerIds } },
          })
        : 0,
      db.assessmentAnswer.count({
        where: { attemptId: { in: attemptIds } },
      }),
      db.contentProgress.count({ where: { userId } }),
      db.vocabularyRecallChallenge.count({ where: { userId } }),
      db.vocabularyMemory.count({ where: { userId } }),
      db.userActivityEvent.count({ where: { userId } }),
      db.userAchievement.count({ where: { userId } }),
      db.userGamification.count({ where: { userId } }),
    ]);

  return {
    attemptIds,
    answerIds,
    counts: {
      attempts: attemptIds.length,
      answers,
      answerSelections: selections,
      contentProgress: content,
      recallChallenges: challenges,
      vocabularyMemory: memory,
      activityEvents: activity,
      achievements,
      gamificationRows: gamification,
    },
  };
}

const { attemptIds, answerIds, counts } = await collectCounts();
const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

console.log(`User: ${user.name} <${user.email}> (${userId})`);
console.table(counts);

if (!values.execute) {
  console.log(
    `\nDry run — nothing deleted (${total} rows found). Re-run with --execute to delete.`,
  );
  process.exit(0);
}

if (total === 0) {
  console.log("\nNothing to delete.");
  process.exit(0);
}

await db.$transaction([
  ...(answerIds.length
    ? [
        db.assessmentAnswerSelection.deleteMany({
          where: { answerId: { in: answerIds } },
        }),
      ]
    : []),
  ...(attemptIds.length
    ? [
        db.assessmentAnswer.deleteMany({
          where: { attemptId: { in: attemptIds } },
        }),
        db.assessmentAttempt.deleteMany({ where: { userId } }),
      ]
    : []),
  db.contentProgress.deleteMany({ where: { userId } }),
  db.vocabularyRecallChallenge.deleteMany({ where: { userId } }),
  db.vocabularyMemory.deleteMany({ where: { userId } }),
  db.userActivityEvent.deleteMany({ where: { userId } }),
  db.userAchievement.deleteMany({ where: { userId } }),
  db.userGamification.deleteMany({ where: { userId } }),
]);

console.log(`\nDeleted ${total} progress rows for ${email}.`);
console.log(
  "Kept: account, sessions, enrollments, event participations. " +
    "Gamification summary recreates itself on the next activity.",
);
