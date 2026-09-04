import { describe, expect, test } from "bun:test";

import { resourcePickerQuery } from "./resource-picker-callback";

describe("resource picker callback", () => {
  test("keeps a safe same-origin return path", () => {
    expect(resourcePickerQuery("token", "/workspace/acme/materials/1")).toBe(
      "?pickerToken=token&returnTo=%2Fworkspace%2Facme%2Fmaterials%2F1",
    );
  });

  test("drops protocol-relative and backslash redirect attempts", () => {
    expect(resourcePickerQuery("token", "//example.com/steal")).toBe(
      "?pickerToken=token",
    );
    expect(resourcePickerQuery("token", "/\\example.com/steal")).toBe(
      "?pickerToken=token",
    );
  });
});
