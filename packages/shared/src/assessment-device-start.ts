/**
 * Whether the app may start an attempt on its own, without waiting for the
 * server: it makes the attempt id and shuffle seed, orders the questions from
 * the course bundle and queues an `ASSESSMENT_STARTED` operation the server
 * records later (offline too). Only for attempts the server has nothing to
 * decide about when they start:
 * - no time limit (a deadline would run on the device clock),
 * - no attempt limit (the count of earlier attempts is the server's),
 * - no sections (their timeline and app-version checks run on the server).
 * Assessment events (Latihan, Tryout) always start on the server, and so do
 * learners who must pick one of several classes first.
 */
export function startsOnDevice(assessment: {
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  sectionCount: number;
}) {
  return (
    assessment.timeLimitMinutes === null &&
    assessment.maxAttempts === null &&
    assessment.sectionCount === 0
  );
}
