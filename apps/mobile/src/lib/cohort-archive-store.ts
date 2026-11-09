import type { ArchiveOverride } from "./cohort-archive";
import { createUserCourseStore } from "./user-json-store";

function isOverride(value: unknown): value is ArchiveOverride {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.state === "archived" ||
    (record.state === "shown" && typeof record.itemCount === "number")
  );
}

const store = createUserCourseStore("hakgyo:cohort-archive:v1", isOverride);

/** Sets (or, with `undefined`, clears) the learner's choice for a course. */
export const setArchiveOverride = store.set;

/** The learner's archive choices on this device, following changes. */
export const useArchiveOverrides = store.useRecords;
