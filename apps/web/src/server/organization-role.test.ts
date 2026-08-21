import { describe, expect, test } from "bun:test";

import { canDemoteOwner, isSerializableConflict } from "./organization-role";

describe("organization owner protection", () => {
  test("does not allow a transaction to demote the final owner", () => {
    expect(canDemoteOwner(1, "ADMIN")).toBe(false);
    expect(canDemoteOwner(2, "ADMIN")).toBe(true);
    expect(canDemoteOwner(1, "OWNER")).toBe(true);
  });

  test("recognizes PostgreSQL serialization conflicts for bounded retry", () => {
    expect(isSerializableConflict({ code: "P2034" })).toBe(true);
    expect(isSerializableConflict({ code: "P2002" })).toBe(false);
  });
});
