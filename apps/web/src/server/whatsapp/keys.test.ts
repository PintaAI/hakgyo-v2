import { expect, test } from "bun:test";

import {
  autoCreateGroupKey,
  createGroupKey,
  eventScheduledKey,
  eventScheduledPrefix,
  meetingReminderKey,
  meetingReminderPrefix,
} from "~/server/whatsapp/keys";

test("keys change with the time they announce", () => {
  const first = new Date("2026-10-20T01:00:00Z");
  const moved = new Date("2026-10-21T01:00:00Z");
  expect(meetingReminderKey("m1", first)).not.toBe(
    meetingReminderKey("m1", moved),
  );
  expect(meetingReminderKey("m1", first)).toBe(
    meetingReminderKey("m1", new Date(first)),
  );
  expect(eventScheduledKey("e1", "c1", first)).not.toBe(
    eventScheduledKey("e1", "c2", first),
  );
});

test("prefixes match every key of their entity only", () => {
  const at = new Date("2026-10-20T01:00:00Z");
  expect(
    meetingReminderKey("m1", at).startsWith(meetingReminderPrefix("m1")),
  ).toBe(true);
  expect(
    meetingReminderKey("m10", at).startsWith(meetingReminderPrefix("m1")),
  ).toBe(false);
  expect(
    eventScheduledKey("e1", "c1", at).startsWith(eventScheduledPrefix("e1")),
  ).toBe(true);
});

test("manual and automatic group creation never share a key", () => {
  expect(createGroupKey("c1", 0)).not.toBe(autoCreateGroupKey("c1"));
  expect(createGroupKey("c1", 0)).not.toBe(createGroupKey("c1", 1));
});
