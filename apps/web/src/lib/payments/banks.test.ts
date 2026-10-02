import { describe, expect, test } from "bun:test";

import { bankBadge, indonesianBanks } from "./banks";

describe("bankBadge", () => {
  test("uses the brand label and colour of well-known banks", () => {
    expect(bankBadge("014", "Bank Central Asia (BCA)")).toEqual({
      label: "BCA",
      background: "#0060AF",
      foreground: "#FFFFFF",
    });
  });

  test("keeps text readable on light brand colours", () => {
    expect(bankBadge("542", "Bank Jago").foreground).toBe("#111827");
  });

  test("derives initials for other and custom banks", () => {
    expect(bankBadge("513", "Bank Ina Perdana").label).toBe("IP");
    expect(bankBadge("118", "Bank Nagari").label).toBe("NAG");
    expect(bankBadge("OTHER", "BPR Sejahtera Makmur").label).toBe("BSM");
  });

  test("every listed bank gets a short label", () => {
    for (const bank of indonesianBanks) {
      const { label } = bankBadge(bank.code, bank.name);
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(5);
    }
  });
});
