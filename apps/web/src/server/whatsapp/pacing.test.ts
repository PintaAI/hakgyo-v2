import { describe, expect, test } from "bun:test";

import {
  GROUP_MESSAGES_PER_DAY,
  MAX_SEND_GAP_MS,
  MIN_SEND_GAP_MS,
  remainingBudget,
  retryDelayMs,
  sendGapMs,
} from "~/server/whatsapp/pacing";

describe("retryDelayMs", () => {
  test("backs off 10 minutes, 30 minutes, then 2 hours", () => {
    expect(retryDelayMs(1)).toBe(10 * 60_000);
    expect(retryDelayMs(2)).toBe(30 * 60_000);
    expect(retryDelayMs(3)).toBe(2 * 60 * 60_000);
    expect(retryDelayMs(9)).toBe(2 * 60 * 60_000);
  });
});

test("sendGapMs stays within the gap range", () => {
  expect(sendGapMs(0)).toBe(MIN_SEND_GAP_MS);
  expect(sendGapMs(1)).toBe(MAX_SEND_GAP_MS);
  expect(sendGapMs(0.5)).toBe((MIN_SEND_GAP_MS + MAX_SEND_GAP_MS) / 2);
});

describe("remainingBudget", () => {
  test("groups are limited per hour and per day", () => {
    expect(
      remainingBudget({
        groupsLastHour: 0,
        groupsLastDay: 0,
        messagesLastDay: 0,
      }).CREATE_GROUP,
    ).toBe(3);
    expect(
      remainingBudget({
        groupsLastHour: 2,
        groupsLastDay: 2,
        messagesLastDay: 0,
      }).CREATE_GROUP,
    ).toBe(1);
    expect(
      remainingBudget({
        groupsLastHour: 0,
        groupsLastDay: 9,
        messagesLastDay: 0,
      }).CREATE_GROUP,
    ).toBe(1);
    expect(
      remainingBudget({
        groupsLastHour: 5,
        groupsLastDay: 12,
        messagesLastDay: 0,
      }).CREATE_GROUP,
    ).toBe(0);
  });

  test("group messages are limited per day", () => {
    expect(
      remainingBudget({
        groupsLastHour: 0,
        groupsLastDay: 0,
        messagesLastDay: GROUP_MESSAGES_PER_DAY - 4,
      }).GROUP_MESSAGE,
    ).toBe(4);
    expect(
      remainingBudget({
        groupsLastHour: 0,
        groupsLastDay: 0,
        messagesLastDay: GROUP_MESSAGES_PER_DAY + 1,
      }).GROUP_MESSAGE,
    ).toBe(0);
  });
});
