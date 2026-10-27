import {
  createLogEntry,
  MAX_LOG_ENTRIES_PER_WRITE,
  type AttemptLogEntry,
} from "@hakgyo/shared";
import Storage from "expo-sqlite/kv-store";

/**
 * The attempt progress log on the device (docs/eps-topik-simulation.md section 5.2). Entries are
 * stamped with the device clock corrected by the offset measured when the attempt started, kept
 * in device storage so an app restart continues the same sequence, and sent whole with each
 * progress and completion operation (the server skips entries it already has).
 */
export type AttemptLog = {
  entries: AttemptLogEntry[];
  nextSeq: number;
  /** Server time minus device time when the attempt started (0 when unknown). */
  clockOffsetMs: number;
};

const logKey = (userId: string, attemptId: string) =>
  `hakgyo:attempt-log:v1:${userId}:${attemptId}`;
const clockKey = (userId: string, attemptId: string) =>
  `hakgyo:attempt-clock:v1:${userId}:${attemptId}`;

function readClockOffset(userId: string, attemptId: string) {
  const raw = Storage.getItemSync(clockKey(userId, attemptId));
  const offset = raw === null ? 0 : Number(raw);
  return Number.isFinite(offset) ? offset : 0;
}

/** Remembers how far the device clock is off, right after the server started the attempt. */
export function saveAttemptClock(
  userId: string,
  attemptId: string,
  serverNow: Date,
) {
  try {
    Storage.setItemSync(
      clockKey(userId, attemptId),
      String(serverNow.getTime() - Date.now()),
    );
  } catch {
    // Without the offset entries use the device clock; the server bounds it.
  }
}

/** The stored log, or a fresh one continuing after the server's last processed sequence. */
export function readAttemptLog(
  userId: string,
  attemptId: string,
  serverSeq: number,
): AttemptLog {
  const clockOffsetMs = readClockOffset(userId, attemptId);
  try {
    const raw = Storage.getItemSync(logKey(userId, attemptId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AttemptLog>;
      if (Array.isArray(parsed.entries) && typeof parsed.nextSeq === "number") {
        return {
          entries: parsed.entries,
          nextSeq: Math.max(parsed.nextSeq, serverSeq + 1),
          clockOffsetMs,
        };
      }
    }
  } catch {
    // A damaged log starts over after the server's sequence; server answers still show.
  }
  return { entries: [], nextSeq: serverSeq + 1, clockOffsetMs };
}

export function saveAttemptLog(
  userId: string,
  attemptId: string,
  log: AttemptLog,
) {
  Storage.setItemSync(
    logKey(userId, attemptId),
    JSON.stringify({ entries: log.entries, nextSeq: log.nextSeq }),
  );
}

export function removeAttemptLog(userId: string, attemptId: string) {
  try {
    Storage.removeItemSync(logKey(userId, attemptId));
    Storage.removeItemSync(clockKey(userId, attemptId));
  } catch {
    // The attempt is finished; a stale log is ignored by the server.
  }
}

/** Device time corrected to the server's clock. */
export function correctedNow(log: AttemptLog) {
  return new Date(Date.now() + log.clockOffsetMs);
}

/** Appends an entry stamped now; keeps the newest entries if the log grows past one write. */
export function appendAttemptLog(
  log: AttemptLog,
  kind: AttemptLogEntry["kind"],
  fields: Omit<AttemptLogEntry, "seq" | "kind" | "clientAt">,
): AttemptLog {
  const entry = createLogEntry(log.nextSeq, kind, fields, correctedNow(log));
  return {
    ...log,
    entries: [...log.entries, entry].slice(-MAX_LOG_ENTRIES_PER_WRITE),
    nextSeq: log.nextSeq + 1,
  };
}
