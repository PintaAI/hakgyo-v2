import { describe, expect, test } from "bun:test";

import {
  DEFAULT_STUDY_REMINDER,
  formatReminderTime,
  parseStudyReminder,
  planStudyReminderDates,
  studyReminderContent,
} from "./study-reminder-plan";

describe("planStudyReminderDates", () => {
  const evening = { hour: 19, minute: 0 };

  test("starts today when the time is still ahead", () => {
    const now = new Date(2026, 10, 12, 8, 0);
    const dates = planStudyReminderDates(evening, {
      now,
      studiedToday: false,
      days: 3,
    });
    expect(dates).toEqual([
      new Date(2026, 10, 12, 19, 0),
      new Date(2026, 10, 13, 19, 0),
      new Date(2026, 10, 14, 19, 0),
    ]);
  });

  test("skips today once the learner studied", () => {
    const now = new Date(2026, 10, 12, 8, 0);
    const dates = planStudyReminderDates(evening, {
      now,
      studiedToday: true,
      days: 3,
    });
    expect(dates).toEqual([
      new Date(2026, 10, 13, 19, 0),
      new Date(2026, 10, 14, 19, 0),
    ]);
  });

  test("skips a time already past today", () => {
    const now = new Date(2026, 10, 12, 19, 0);
    const dates = planStudyReminderDates(evening, {
      now,
      studiedToday: false,
      days: 2,
    });
    expect(dates).toEqual([new Date(2026, 10, 13, 19, 0)]);
  });

  test("crosses month ends", () => {
    const now = new Date(2026, 10, 30, 20, 0);
    const dates = planStudyReminderDates(
      { hour: 7, minute: 30 },
      { now, studiedToday: false, days: 2 },
    );
    expect(dates).toEqual([new Date(2026, 11, 1, 7, 30)]);
  });
});

describe("parseStudyReminder", () => {
  test("falls back to the default for missing or broken values", () => {
    expect(parseStudyReminder(null)).toEqual(DEFAULT_STUDY_REMINDER);
    expect(parseStudyReminder("not json")).toEqual(DEFAULT_STUDY_REMINDER);
    expect(parseStudyReminder("null")).toEqual(DEFAULT_STUDY_REMINDER);
  });

  test("keeps valid fields and replaces invalid ones", () => {
    expect(
      parseStudyReminder(
        JSON.stringify({ enabled: true, minutes: 15, hour: 25, minute: 30 }),
      ),
    ).toEqual({ enabled: true, minutes: 15, hour: 19, minute: 30 });
  });
});

test("formatReminderTime pads with a dot", () => {
  expect(formatReminderTime(7, 5)).toBe("07.05");
  expect(formatReminderTime(19, 0)).toBe("19.00");
});

test("studyReminderContent names the minutes and rotates by day", () => {
  const first = studyReminderContent(10, new Date(2026, 10, 12));
  const next = studyReminderContent(10, new Date(2026, 10, 13));
  expect(first.body).toContain("10 menit");
  expect(next.title).not.toBe(first.title);
});
