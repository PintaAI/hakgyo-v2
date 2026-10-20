import { describe, expect, test } from "bun:test";

import {
  eventScheduledText,
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_SUBJECT_MAX_LENGTH,
  groupDescription,
  groupSubject,
  meetingReminderText,
} from "~/server/whatsapp/messages";

const appUrl = "https://hakgyo.test";

describe("groupSubject", () => {
  test("keeps short names and truncates long ones", () => {
    expect(groupSubject("  Kelas A  ")).toBe("Kelas A");
    const long = groupSubject("x".repeat(150));
    expect(long).toHaveLength(GROUP_SUBJECT_MAX_LENGTH);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("groupDescription", () => {
  test("ends with the course link", () => {
    expect(
      groupDescription({
        appUrl,
        cohortDescription: "Belajar tiap Senin.",
        courseId: "c1",
        courseTitle: "TOPIK I",
      }),
    ).toBe(
      "Belajar tiap Senin.\n\nKelas TOPIK I di Hakgyo: https://hakgyo.test/learn/c1",
    );
  });

  test("fits WhatsApp's limit and keeps the link", () => {
    const description = groupDescription({
      appUrl,
      cohortDescription: "y".repeat(5000),
      courseId: "c1",
      courseTitle: "TOPIK I",
    });
    expect(description.length).toBeLessThanOrEqual(
      GROUP_DESCRIPTION_MAX_LENGTH,
    );
    expect(description.endsWith("/learn/c1")).toBe(true);
  });
});

test("meetingReminderText shows the meeting time and links", () => {
  const text = meetingReminderText({
    appUrl,
    title: "Pertemuan 3",
    startsAt: new Date("2026-10-19T12:00:00Z"),
    timeZone: "Asia/Jakarta",
    joinUrl: "https://zoom.us/j/1",
    courseId: "c1",
  });
  expect(text).toContain("*Segera dimulai: Pertemuan 3*");
  expect(text).toContain("19.00");
  expect(text).toContain("WIB");
  expect(text).toContain("Gabung meeting: https://zoom.us/j/1");
  expect(text).toContain("https://hakgyo.test/learn/c1");
});

test("eventScheduledText uses absolute WIB times", () => {
  const text = eventScheduledText({
    appUrl,
    eventId: "e1",
    type: "TRYOUT",
    title: "Tryout 1",
    courseTitle: "TOPIK I",
    opensAt: new Date("2026-10-20T01:00:00Z"),
    closesAt: new Date("2026-10-20T03:00:00Z"),
  });
  const lines = text.split("\n");
  expect(lines).toHaveLength(5);
  expect(lines[0]).toBe("*Tryout dijadwalkan: Tryout 1*");
  expect(lines[1]).toBe("TOPIK I");
  expect(lines[2]).toMatch(/^Dibuka: .*08\.00 WIB$/);
  expect(lines[3]).toMatch(/^Ditutup: .*10\.00 WIB$/);
  expect(lines[4]).toBe(
    "Kerjakan di Hakgyo: https://hakgyo.test/learn/assessments/e1",
  );
});
