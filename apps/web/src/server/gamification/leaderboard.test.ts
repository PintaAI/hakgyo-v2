import { describe, expect, test } from "bun:test";

import {
  leaderboardName,
  leaderboardWeek,
  xpToPass,
} from "~/server/gamification/leaderboard";

describe("leaderboardName", () => {
  test("keeps the first name and the initial of the last one", () => {
    expect(leaderboardName("Qurotha Ayunina")).toBe("Qurotha A.");
    expect(leaderboardName("  siti  nur  aisyah ")).toBe("siti A.");
  });

  test("keeps a single name and names an empty one", () => {
    expect(leaderboardName("Budi")).toBe("Budi");
    expect(leaderboardName("   ")).toBe("Murid");
  });
});

describe("xpToPass", () => {
  test("needs one XP more than the learner above, since ties go to the earlier one", () => {
    expect(xpToPass(450, 500)).toBe(51);
    expect(xpToPass(500, 500)).toBe(1);
  });

  test("is null at the top", () => {
    expect(xpToPass(900, undefined)).toBeNull();
  });
});

describe("leaderboardWeek", () => {
  test("starts on Monday in WIB", () => {
    // Sunday 23:30 UTC is already Monday 06:30 in Jakarta.
    expect(leaderboardWeek(new Date("2026-11-15T23:30:00Z"))).toEqual({
      startsOn: "2026-11-16",
      endsOn: "2026-11-23",
    });
    expect(leaderboardWeek(new Date("2026-11-12T05:00:00Z"))).toEqual({
      startsOn: "2026-11-09",
      endsOn: "2026-11-16",
    });
  });
});
