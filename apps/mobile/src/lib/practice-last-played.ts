import { createUserRecordStore } from "./user-json-store";

/**
 * The source last picked for each Latihan game, kept on this device per
 * account, so the source sheet can offer it again at the top.
 */
export type LastPlayed =
  | { kind: "item"; courseId: string; courseItemId: string; at: string }
  | { kind: "event"; eventId: string; at: string };

function isLastPlayed(value: unknown): value is LastPlayed {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.at !== "string") return false;
  return record.kind === "item"
    ? typeof record.courseId === "string" &&
        typeof record.courseItemId === "string"
    : record.kind === "event" && typeof record.eventId === "string";
}

// Keyed by the game's tool key.
const store = createUserRecordStore("hakgyo:practice-last:v1", isLastPlayed);

export const setLastPlayed = store.set;
export const useLastPlayed = store.useRecords;
