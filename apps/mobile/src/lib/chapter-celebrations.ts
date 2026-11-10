import { createUserRecordStore } from "./user-json-store";

/**
 * The chapters (course modules) whose "Bab selesai" page the learner has
 * seen, kept on this device per account, so finishing a chapter shows it
 * once rather than on every later visit to one of its activities.
 */
const store = createUserRecordStore(
  "hakgyo:chapter-celebrated:v1",
  (value): value is true => value === true,
);

export function chapterCelebrated(userId: string, moduleId: string) {
  return store.get(userId, moduleId) === true;
}

export function markChapterCelebrated(userId: string, moduleId: string) {
  store.set(userId, moduleId, true);
}
