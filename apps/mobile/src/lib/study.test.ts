import { describe, expect, test } from "bun:test";
import { canOpenModule, meetingState, safeExternalUrl } from "./study";

test("completed modules remain available for daily replay", () => {
  expect(canOpenModule("AVAILABLE")).toBe(true);
  expect(canOpenModule("COMPLETED")).toBe(true);
  expect(canOpenModule("LOCKED")).toBe(false);
  expect(canOpenModule("unknown")).toBe(false);
});

describe("student meeting actions", () => {
  const startsAt = new Date("2026-09-06T10:00:00Z");
  const meeting = { startsAt, durationMinutes: 60, status: "SCHEDULED" };
  test("join opens ten minutes early and closes at the end", () => {
    expect(meetingState(meeting, startsAt.getTime() - 600_001)).toBe(
      "upcoming",
    );
    expect(meetingState(meeting, startsAt.getTime() - 600_000)).toBe("joining");
    expect(meetingState(meeting, startsAt.getTime())).toBe("live");
    expect(meetingState(meeting, startsAt.getTime() + 3_600_000)).toBe("ended");
    expect(
      meetingState({ ...meeting, status: "CANCELLED" }, startsAt.getTime()),
    ).toBe("ended");
  });
  test("external links reject lookalike domains, credentials and non-HTTPS URLs", () => {
    expect(
      safeExternalUrl("https://us02web.zoom.us/j/123", "zoom"),
    ).toBeTruthy();
    expect(
      safeExternalUrl("https://chat.whatsapp.com/invite", "whatsapp"),
    ).toBeTruthy();
    for (const url of [
      "https://zoom.us.evil.test/j/123",
      "javascript:alert(1)",
      "https://evil@zoom.us/j/123",
      "http://zoom.us/j/123",
    ]) {
      expect(safeExternalUrl(url, "zoom")).toBeNull();
    }
  });
});
