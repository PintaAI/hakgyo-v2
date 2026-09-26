import { describe, expect, test } from "bun:test";

import { canDemoteOwner } from "./organization-role";

describe("organization owner protection", () => {
  test("does not allow a transaction to demote the final owner", () => {
    expect(canDemoteOwner(1, "ADMIN")).toBe(false);
    expect(canDemoteOwner(2, "ADMIN")).toBe(true);
    expect(canDemoteOwner(1, "OWNER")).toBe(true);
  });
});
