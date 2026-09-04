import { beforeEach, describe, expect, mock, test } from "bun:test";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  suspendedAt: Date | null;
  deletedAt: Date | null;
};

const findUnique = mock<() => Promise<UserRecord>>(() =>
  Promise.resolve({
    id: "user-1",
    name: "Owner",
    email: "ADMIN@example.com",
    image: null,
    suspendedAt: null,
    deletedAt: null,
  }),
);

const actualEnv = await import("~/env");
void mock.module("~/env", () => ({
  env: {
    ...actualEnv.env,
    SUPERADMIN_EMAILS: " admin@example.com,owner@example.com ",
  },
}));
void mock.module("~/server/db", () => ({ db: { user: { findUnique } } }));

const { getSuperadminUser, isSuperadminEmail } = await import("./superadmin");

describe("superadmin authorization", () => {
  beforeEach(() => {
    findUnique.mockResolvedValue({
      id: "user-1",
      name: "Owner",
      email: "ADMIN@example.com",
      image: null,
      suspendedAt: null,
      deletedAt: null,
    });
  });

  test("normalizes configured and account email addresses", () => {
    expect(isSuperadminEmail("ADMIN@example.com")).toBe(true);
    expect(isSuperadminEmail("unknown@example.com")).toBe(false);
  });

  test("returns an active allowlisted user", async () => {
    const user = await getSuperadminUser("user-1");
    expect(user).toMatchObject({ id: "user-1" });
  });

  test("denies suspended users", async () => {
    findUnique.mockResolvedValueOnce({
      id: "user-1",
      name: "Owner",
      email: "admin@example.com",
      image: null,
      suspendedAt: new Date(),
      deletedAt: null,
    });

    try {
      await getSuperadminUser("user-1");
      throw new Error("expected authorization to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    }
  });
});
